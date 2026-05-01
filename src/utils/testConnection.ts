import { collection, getDocs } from "firebase/firestore"
import { db } from "@/lib/firebase"

export async function testConnection() {
  try {
    const querySnapshot = await getDocs(collection(db, "trades"))
    console.log("✅ Firebase Connected. Trades count:", querySnapshot.size)
  } catch (error) {
    console.error("❌ Firebase NOT connected:", error)
  }
}