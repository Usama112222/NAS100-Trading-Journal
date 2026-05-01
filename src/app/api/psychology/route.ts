import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { collection, addDoc, updateDoc, deleteDoc, doc, getDocs, query, orderBy, getDoc, where } from 'firebase/firestore';

const psychologyCollection = collection(db, 'psychology');

// GET - Fetch psychology entries for a specific user
export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');
    
    if (!userId) {
      return NextResponse.json(
        { success: false, error: 'userId is required' },
        { status: 400 }
      );
    }
    
    // Query only entries for this user
    const q = query(
      psychologyCollection, 
      where('userId', '==', userId),
      orderBy('createdAt', 'desc')
    );
    const querySnapshot = await getDocs(q);
    const entries = querySnapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    }));
    
    return NextResponse.json({ success: true, entries });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to fetch psychology entries:', errorMessage);
    return NextResponse.json({ success: true, entries: [] });
  }
}

// POST - Create or update psychology entry
export async function POST(request: Request) {
  try {
    const body = await request.json();
    
    console.log('Received psychology entry:', body);
    
    // Validate required fields
    if (!body.tradeId) {
      return NextResponse.json({ success: false, error: 'Missing tradeId' }, { status: 400 });
    }
    
    if (!body.userId) {
      return NextResponse.json({ success: false, error: 'Missing userId' }, { status: 400 });
    }
    
    // If entry has an id, check if it exists and update
    if (body.id && body.id.length > 0) {
      const entryRef = doc(db, 'psychology', body.id);
      const entryDoc = await getDoc(entryRef);
      
      if (entryDoc.exists()) {
        // Verify ownership - only allow update if userId matches
        const entryData = entryDoc.data();
        if (entryData.userId !== body.userId) {
          return NextResponse.json(
            { success: false, error: 'Unauthorized: Cannot update another user\'s entry' },
            { status: 403 }
          );
        }
        
        await updateDoc(entryRef, {
          emotions: body.emotions || [],
          mistakes: body.mistakes || [],
          notes: body.notes || '',
          discipline: body.discipline || 7,
          confidence: body.confidence || 7,
          sleepQuality: body.sleepQuality || 7,
          preTradeRoutine: body.preTradeRoutine || false,
          followedPlan: body.followedPlan || false,
          updatedAt: new Date().toISOString()
        });
        return NextResponse.json({ success: true, entry: { id: body.id, ...body } });
      }
    }
    
    // Create new entry with userId
    const newEntry = {
      userId: body.userId, // IMPORTANT: Add userId for data isolation
      tradeId: body.tradeId,
      date: body.date || new Date().toISOString().split('T')[0],
      emotions: body.emotions || [],
      mistakes: body.mistakes || [],
      notes: body.notes || '',
      discipline: body.discipline || 7,
      confidence: body.confidence || 7,
      sleepQuality: body.sleepQuality || 7,
      preTradeRoutine: body.preTradeRoutine || false,
      followedPlan: body.followedPlan || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    
    const docRef = await addDoc(psychologyCollection, newEntry);
    return NextResponse.json({ success: true, entry: { id: docRef.id, ...newEntry } });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to save psychology entry:', errorMessage);
    return NextResponse.json({ success: false, error: `Failed to save entry: ${errorMessage}` }, { status: 500 });
  }
}

// DELETE - Delete psychology entry
export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    const userId = searchParams.get('userId');
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'Entry ID required' }, { status: 400 });
    }
    
    if (!userId) {
      return NextResponse.json({ success: false, error: 'userId required' }, { status: 400 });
    }
    
    // Verify ownership before deletion
    const entryRef = doc(db, 'psychology', id);
    const entryDoc = await getDoc(entryRef);
    
    if (!entryDoc.exists()) {
      return NextResponse.json({ success: false, error: 'Entry not found' }, { status: 404 });
    }
    
    const entryData = entryDoc.data();
    if (entryData.userId !== userId) {
      return NextResponse.json(
        { success: false, error: 'Unauthorized: Cannot delete another user\'s entry' },
        { status: 403 }
      );
    }
    
    await deleteDoc(entryRef);
    
    return NextResponse.json({ success: true });
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('Failed to delete psychology entry:', errorMessage);
    return NextResponse.json({ success: false, error: `Failed to delete entry: ${errorMessage}` }, { status: 500 });
  }
}