import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { 
  collection, addDoc, getDocs, query, where, deleteDoc, doc, updateDoc, getDoc 
} from 'firebase/firestore';
import { getAuth } from 'firebase/auth';

// Helper to get user ID from request
async function getUserIdFromRequest(request: NextRequest) {
  // First try to get from query parameter
  const urlUserId = new URL(request.url).searchParams.get('userId');
  if (urlUserId) return urlUserId;
  
  // Otherwise try to get from authorization header or session
  // For now, return a default or get from Firebase Admin SDK
  // This is a simplified version - you should implement proper auth
  return null;
}

// GET - Fetch all accounts for a user
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    let userId = searchParams.get('userId');
    
    // If no userId provided, try to get from the user's session
    // For now, if no userId, return empty array
    if (!userId) {
      // In a real app, you'd get this from the session/token
      // For testing, return empty accounts
      return NextResponse.json({ success: true, accounts: [] });
    }
    
    const accountsRef = collection(db, 'accounts');
    const q = query(accountsRef, where('userId', '==', userId));
    const querySnapshot = await getDocs(q);
    
    const accounts: any[] = [];
    querySnapshot.forEach((doc) => {
      accounts.push({ id: doc.id, ...doc.data() });
    });
    
    return NextResponse.json({ success: true, accounts });
  } catch (error: any) {
    console.error('GET accounts error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// POST - Create new account
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    // Get userId from body or from auth
    let userId = body.userId;
    
    // If no userId provided, we need to get it from Firebase Auth
    // For now, since we're in development, we'll create a default user ID
    // In production, you should get this from the authenticated session
    if (!userId) {
      // Create a default user ID for development
      // In production, you'd get this from Firebase Admin SDK
      userId = 'default-user-' + Date.now();
    }
    
    const newAccount = {
      userId: userId,
      name: body.name || 'Trading Account',
      broker: body.broker || 'Manual',
      initialBalance: parseFloat(body.initialBalance) || 50000,
      currentBalance: parseFloat(body.initialBalance) || 50000,
      currency: body.currency || 'USD',
      isActive: body.isActive || false,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    
    const docRef = await addDoc(collection(db, 'accounts'), newAccount);
    
    return NextResponse.json({
      success: true,
      message: 'Account created successfully',
      account: { id: docRef.id, ...newAccount }
    }, { status: 201 });
    
  } catch (error: any) {
    console.error('POST account error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// PUT - Update account
export async function PUT(request: NextRequest) {
  try {
    const body = await request.json();
    const { id, ...updateData } = body;
    
    if (!id) {
      return NextResponse.json(
        { success: false, error: 'Account ID is required' },
        { status: 400 }
      );
    }
    
    const accountRef = doc(db, 'accounts', id);
    await updateDoc(accountRef, {
      ...updateData,
      updatedAt: new Date().toISOString()
    });
    
    return NextResponse.json({ success: true, message: 'Account updated successfully' });
  } catch (error: any) {
    console.error('PUT account error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}

// DELETE - Delete account
export async function DELETE(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const id = searchParams.get('id');
    
    if (!id) {
      return NextResponse.json({ success: false, error: 'Account ID required' }, { status: 400 });
    }
    
    const accountRef = doc(db, 'accounts', id);
    await deleteDoc(accountRef);
    
    return NextResponse.json({ success: true, message: 'Account deleted successfully' });
  } catch (error: any) {
    console.error('DELETE account error:', error);
    return NextResponse.json({ success: false, error: error.message }, { status: 500 });
  }
}