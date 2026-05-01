import { collection, addDoc } from "firebase/firestore"
import { db } from "@/lib/firebase"

export async function createTrade() {
  try {
    const docRef = await addDoc(collection(db, "trades"), {
      date: new Date(),
      session: "NY_OPEN",
      bias: "BULLISH",
      entryPrice: 15000,
      stopLoss: 14980,
      takeProfit: 15040,
      result: "WIN",
      rr: 2,
      createdAt: new Date()
    })

    console.log("✅ Trade saved with ID:", docRef.id)
  } catch (error) {
    console.error("❌ Error saving trade:", error)
  }
}