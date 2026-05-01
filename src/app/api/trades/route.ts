import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { 
  collection, 
  addDoc, 
  getDocs, 
  getDoc, 
  updateDoc, 
  doc, 
  query, 
  where, 
  orderBy 
} from 'firebase/firestore';

// Helper function to calculate weighted average exit price
function calculateWeightedAverageExitPrice(partialCloses: any[], finalExitPrice: number | null, finalExitPercentage: number): number {
  let totalValue = 0;
  let totalPercentage = 0;
  
  if (partialCloses && partialCloses.length > 0) {
    partialCloses.forEach(close => {
      if (close.percentage > 0 && close.price > 0) {
        totalValue += close.price * close.percentage;
        totalPercentage += close.percentage;
      }
    });
  }
  
  if (finalExitPrice && finalExitPercentage > 0) {
    totalValue += finalExitPrice * finalExitPercentage;
    totalPercentage += finalExitPercentage;
  }
  
  return totalPercentage > 0 ? totalValue / totalPercentage : 0;
}

// ============================================
// POST - Create a new trade
// ============================================
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    console.log('=== NEW TRADE REQUEST ===');
    console.log('Direction:', body.direction);
    console.log('Partial Closes Enabled:', body.partialClosesEnabled);
    
    // Validate required fields
    if (!body.date || !body.session || !body.entryPrice || !body.stopLoss) {
      return NextResponse.json(
        { success: false, error: 'Missing required fields' },
        { status: 400 }
      );
    }
    
    if (!body.accountId) {
      return NextResponse.json(
        { success: false, error: 'Missing accountId' },
        { status: 400 }
      );
    }
    
    // Validate userId - MUST BE PROVIDED
    if (!body.userId) {
      return NextResponse.json(
        { success: false, error: 'Missing userId. Please login again.' },
        { status: 400 }
      );
    }

    const valuePerPoint = 10;
    const entry = parseFloat(body.entryPrice);
    const contracts = body.contracts || 1;
    let totalPnL = 0;
    let exitPrice = 0;
    let weightedAvgExit = 0;
    
    // CASE 1: PARTIAL CLOSES ENABLED
    if (body.partialClosesEnabled && body.partialCloses && body.partialCloses.length > 0) {
      console.log('Calculating partial closes PnL...');
      
      let totalValue = 0;
      let totalPercentage = 0;
      
      for (const close of body.partialCloses) {
        if (!close.price || !close.percentage || close.percentage === 0) continue;
        
        const portionLots = (close.percentage / 100) * contracts;
        let points = 0;
        
        if (body.direction === 'BUY') {
          points = close.price - entry;
        } else {
          points = entry - close.price;
        }
        
        const pnlForPortion = points * valuePerPoint * portionLots;
        totalPnL += pnlForPortion;
        totalValue += close.price * close.percentage;
        totalPercentage += close.percentage;
        
        console.log(`  ${close.percentage}% @ ${close.price}: ${points} points = $${pnlForPortion}`);
      }
      
      const remainingPercentage = 100 - totalPercentage;
      if (body.finalExitPrice && remainingPercentage > 0) {
        const finalLots = (remainingPercentage / 100) * contracts;
        let finalPoints = 0;
        
        if (body.direction === 'BUY') {
          finalPoints = parseFloat(body.finalExitPrice) - entry;
        } else {
          finalPoints = entry - parseFloat(body.finalExitPrice);
        }
        
        const finalPnL = finalPoints * valuePerPoint * finalLots;
        totalPnL += finalPnL;
        totalValue += parseFloat(body.finalExitPrice) * remainingPercentage;
        totalPercentage += remainingPercentage;
        
        console.log(`  Final ${remainingPercentage}% @ ${body.finalExitPrice}: ${finalPoints} points = $${finalPnL}`);
      }
      
      weightedAvgExit = totalPercentage > 0 ? totalValue / totalPercentage : 0;
      exitPrice = weightedAvgExit;
      
      console.log(`Total PnL: $${totalPnL}`);
      console.log(`Weighted Avg Exit: $${weightedAvgExit}`);
    }
    // CASE 2: NO PARTIALS (simple trade)
    else {
      let points = 0;
      
      if (body.result === 'Loss') {
        exitPrice = parseFloat(body.stopLoss);
      } else {
        exitPrice = body.takeProfit ? parseFloat(body.takeProfit) : 
                   body.finalExitPrice ? parseFloat(body.finalExitPrice) : 0;
      }
      
      if (body.direction === 'BUY') {
        points = exitPrice - entry;
      } else {
        points = entry - exitPrice;
      }
      
      totalPnL = points * valuePerPoint * contracts;
      console.log(`Simple trade: ${points} points = $${totalPnL}`);
    }

    // Calculate RR
    const risk = Math.abs(entry - parseFloat(body.stopLoss));
    const reward = Math.abs(exitPrice - entry);
    const rr = risk > 0 ? (reward / risk).toFixed(2) : '0';

    let screenshotUrl = '';
    const imgbbApiKey = process.env.IMGBB_API_KEY;
    
    // Upload screenshot if provided
    if (body.screenshotBase64 && body.screenshotBase64.length > 100 && imgbbApiKey) {
      try {
        let base64Data = body.screenshotBase64;
        if (base64Data.includes(',')) {
          base64Data = base64Data.split(',')[1];
        }
        
        const formData = new FormData();
        formData.append('key', imgbbApiKey);
        formData.append('image', base64Data);
        
        const response = await fetch('https://api.imgbb.com/1/upload', {
          method: 'POST',
          body: formData,
        });
        
        const data = await response.json();
        if (data.success && data.data && data.data.url) {
          screenshotUrl = data.data.url;
        }
      } catch (uploadError) {
        console.error('Upload error:', uploadError);
      }
    }

    // Save to Firestore with userId
    const tradeData = {
      userId: body.userId, // REQUIRED - for data isolation
      accountId: body.accountId,
      accountName: body.accountName || '',
      direction: body.direction || 'BUY',
      date: body.date,
      session: body.session,
      htfBias: body.htfBias || 'Bullish',
      liquiditySweep: body.liquiditySweep || 'No',
      sweepType: body.sweepType || '',
      sweepDetails: body.sweepDetails || '',
      smt: body.smt || 'No',
      htfSmt: body.htfSmt || 'No',
      inducementLevel: body.inducementLevel || '',
      structureShift: body.structureShift || 'None',
      entryType: body.entryType || 'Break',
      entryPrice: entry,
      stopLoss: parseFloat(body.stopLoss),
      takeProfit: body.takeProfit ? parseFloat(body.takeProfit) : null,
      finalExitPrice: body.partialClosesEnabled ? (body.finalExitPrice ? parseFloat(body.finalExitPrice) : null) : null,
      partialClosesEnabled: body.partialClosesEnabled || false,
      partialCloses: body.partialCloses || [],
      finalExitPercentage: body.partialClosesEnabled ? (100 - (body.partialCloses?.reduce((sum: number, c: any) => sum + (c.percentage || 0), 0) || 0)) : 100,
      rr: parseFloat(rr),
      result: body.result || 'Win',
      setupGrade: body.setupGrade || 'B',
      notes: body.notes || '',
      screenshotUrl: screenshotUrl,
      contracts: contracts,
      weightedAvgExit: body.partialClosesEnabled ? weightedAvgExit : null,
      pnlCalculated: totalPnL,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    const docRef = await addDoc(collection(db, 'trades'), tradeData);
    console.log('✅ Trade saved with P&L:', totalPnL);
    
    // Update account balance
    try {
      const accountRef = doc(db, 'accounts', body.accountId);
      const accountSnap = await getDoc(accountRef);
      
      if (accountSnap.exists()) {
        const accountData = accountSnap.data();
        const currentBalance = accountData.currentBalance || accountData.initialBalance || 0;
        const newBalance = currentBalance + totalPnL;
        
        await updateDoc(accountRef, {
          currentBalance: newBalance,
          updatedAt: new Date().toISOString()
        });
        
        console.log(`✅ Account balance: $${currentBalance} → $${newBalance}`);
      }
    } catch (balanceError) {
      console.error('Balance update error:', balanceError);
    }
    
    return NextResponse.json({
      success: true,
      tradeId: docRef.id,
      pnlCalculated: totalPnL,
      exitPrice: exitPrice,
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('API Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// GET - Fetch all trades for a user
// ============================================
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    // Require userId for security
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }
    
    // Query trades only for this user
    const tradesRef = collection(db, 'trades');
    const q = query(
      tradesRef, 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    
    const trades: any[] = [];
    querySnapshot.forEach((doc) => {
      trades.push({ id: doc.id, ...doc.data() });
    });
    
    return NextResponse.json({ success: true, trades });
  } catch (error: any) {
    console.error('GET trades error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}