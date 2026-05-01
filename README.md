# NAS100 Trading Journal 📊

[![Live Demo](https://img.shields.io/badge/Live-Demo-green?style=for-the-badge&logo=vercel)](https://nas-100-trading-journal.vercel.app)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=for-the-badge&logo=typescript)](https://www.typescriptlang.org/)
[![Firebase](https://img.shields.io/badge/Firebase-11.0-orange?style=for-the-badge&logo=firebase)](https://firebase.google.com/)
[![Next.js](https://img.shields.io/badge/Next.js-16.2-black?style=for-the-badge&logo=next.js)](https://nextjs.org/)

A professional trading journal application built for NAS100 traders using ICT/SMC concepts. Track your trades, analyze performance, and improve your trading psychology with detailed metrics and screenshot support.

## 🌐 Live Demo

**Production URL:** [https://nas-100-trading-journal.vercel.app](https://nas-100-trading-journal.vercel.app)

## ✨ Key Features

### 📈 Trade Management
- Log **LONG/SHORT** positions with precise entry/exit prices
- **Partial closes** support with weighted average exit calculation
- Automatic **P&L calculation** ($10/point for NAS100)
- **Risk/Reward ratio** calculator
- **Screenshot uploads** via IMGBB (free image hosting)
- Support for **1:1.0 to 1:2.0+** risk/reward ratios

### 🔍 Advanced Analytics (ICT/SMC Focused)
- **Liquidity sweep** tracking (Internal/External sweeps)
- **SMT (Smart Money Technique)** logging with HTF (Higher Timeframe) support
- **Structure shift** analysis (BOS, CISD, MSS, CHoCH)
- **Session-based** performance (NY Open, London Open, Asia)
- **Setup grading** system (A+ through C)
- **Inducement levels** and Order Block tracking

### 📓 Psychology Journal
- Track emotional state during trades
- Document lessons learned
- Identify recurring patterns in decision making
- Improve trading discipline over time

### 👤 User Management
- Secure **email authentication** (Firebase Auth)
- **Email verification** required for access
- Multiple **trading accounts** per user
- Complete **data isolation** between users

## 🛠️ Technology Stack

| Category | Technology |
|----------|------------|
| **Frontend** | Next.js 16 (App Router), React 19 |
| **Language** | TypeScript 5 |
| **Styling** | Tailwind CSS, Lucide Icons |
| **Backend** | Firebase (Authentication + Firestore) |
| **Image Hosting** | IMGBB API (free tier) |
| **Deployment** | Vercel (production hosting) |
| **State Management** | React Context API |
| **Charts** | Recharts |

## 🚀 Getting Started

### Prerequisites

- **Node.js** 18+ 
- **npm** or **yarn**
- **Firebase account** (free tier - Spark plan)
- **IMGBB account** (free for API key)

## Installation

1. **Clone the repository**

git clone https://github.com/Usama112222/NAS100-Trading-Journal.git
cd NAS100-Trading-Journal
Install dependencies

## 📊 Trading Features Explained

Sessions & Timing

Session	Time (EST)	Characteristics

NY Open	09:30	Highest volatility, best liquidity

NY Mid	12:00	London/NY overlap

NY Close	16:00	End of US session

London Open	03:00	European session start

Asia Open	19:00	Asian session, lower volatility

Setup Grades

Grade	Meaning	Criteria

A+	Perfect	All confirmations present, ideal conditions

A	Great	Most confirmations present

B	Good	Some confirmations missing

C	Poor	Avoid, review what went wrong

Structure Shift Types

Type	Full Name	Description

BOS	Break of Structure	Price breaks a key level

CISD	Change in State of Delivery	Shift in market delivery

MSS	Market Structure Shift	Change in trend direction

CHoCH	Change of Character	Major market shift

## 🤝 Contributing

Contributions are welcome! Please:

Fork the repository

Create a feature branch (git checkout -b feature/amazing)

Commit changes (git commit -m 'Add amazing feature')

Push to branch (git push origin feature/amazing)

Open a Pull Request

## 📝 License
MIT License - Free for personal and commercial use.

## 🙏 Acknowledgments
ICT (Inner Circle Trader) - Trading concepts and methodology

NAS100 community - For testing and feedback

Firebase team - For excellent free tier services

Vercel - For seamless deployment

## 📧 Support
Issues: GitHub Issues

Live App: https://nas-100-trading-journal.vercel.app
