import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, updateDoc, deleteDoc } from 'firebase/firestore';

// ============================================
// PUT - Update a single trade
// ============================================
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await request.json();
    
    console.log('📝 Updating trade:', id);
    console.log('   Update data:', body);
    
    const docRef = doc(db, 'trades', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return NextResponse.json(
        { success: false, error: 'Trade not found' },
        { status: 404 }
      );
    }
    
    await updateDoc(docRef, {
      ...body,
      updatedAt: new Date().toISOString()
    });
    
    console.log('✅ Trade updated:', id);
    
    return NextResponse.json({
      success: true,
      message: 'Trade updated successfully'
    });
  } catch (error: any) {
    console.error('PUT error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// DELETE - Delete a single trade
// ============================================
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    console.log('🗑️ Deleting trade:', id);
    
    const docRef = doc(db, 'trades', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return NextResponse.json(
        { success: false, error: 'Trade not found' },
        { status: 404 }
      );
    }
    
    const tradeData = docSnap.data();
    const accountId = tradeData.accountId;
    const pnlCalculated = tradeData.pnlCalculated || 0;
    
    // Delete the trade
    await deleteDoc(docRef);
    console.log('✅ Trade deleted:', id);
    
    // Update account balance (reverse the P&L)
    if (accountId) {
      const accountRef = doc(db, 'accounts', accountId);
      const accountSnap = await getDoc(accountRef);
      
      if (accountSnap.exists()) {
        const accountData = accountSnap.data();
        const currentBalance = accountData.currentBalance || accountData.initialBalance || 0;
        const newBalance = currentBalance - pnlCalculated;
        
        await updateDoc(accountRef, {
          currentBalance: newBalance,
          updatedAt: new Date().toISOString()
        });
        
        console.log(`✅ Account balance updated: $${currentBalance} → $${newBalance}`);
      }
    }
    
    return NextResponse.json({
      success: true,
      message: 'Trade deleted successfully'
    });
  } catch (error: any) {
    console.error('DELETE error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}

// ============================================
// GET - Fetch a single trade
// ============================================
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    
    const docRef = doc(db, 'trades', id);
    const docSnap = await getDoc(docRef);
    
    if (!docSnap.exists()) {
      return NextResponse.json(
        { success: false, error: 'Trade not found' },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      success: true,
      trade: { id: docSnap.id, ...docSnap.data() }
    });
  } catch (error: any) {
    console.error('GET single trade error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}