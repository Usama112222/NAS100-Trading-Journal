'use client';

import { useState, useRef, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Layout from '@/components/layout/Layout';
import { useAuth } from '@/context/AuthContext';
import { 
  Calendar, Clock, TrendingUp, Target, Shield, Zap,
  AlertCircle, X, Save, ArrowLeft, Camera, CheckCircle,
  GitBranch, Layers, Plus, Trash2, Percent, Wallet
} from 'lucide-react';

interface PartialClose {
  id: string;
  percentage: number;
  price: number;
}

interface Account {
  id: string;
  name: string;
  broker: string;
  currentBalance: number;
  currency: string;
  isActive: boolean;
}

interface PnLCalculation {
  pointsDifference: number;
  pnlValue: number;
  isProfit: boolean;
}

export default function NewTradePage() {
  const router = useRouter();
  const { user } = useAuth(); // Get authenticated user from Firebase
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);
  const [screenshotBase64, setScreenshotBase64] = useState<string>('');
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [accounts, setAccounts] = useState<Account[]>([]);
  const [selectedAccountId, setSelectedAccountId] = useState<string>('');
  const [selectedAccount, setSelectedAccount] = useState<Account | null>(null);
  const [loadingAccounts, setLoadingAccounts] = useState(true);
  
  const [contracts, setContracts] = useState(1);
  const [pnlCalculation, setPnlCalculation] = useState<PnLCalculation | null>(null);
  
  const [partialCloses, setPartialCloses] = useState<PartialClose[]>([
    { id: '1', percentage: 25, price: 0 }
  ]);
  
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    session: 'NY Open',
    direction: 'BUY',
    htfBias: 'Bullish',
    liquiditySweep: 'No',
    sweepType: '',
    sweepDetails: '',
    smt: 'No',
    htfSmt: 'No',
    inducementLevel: '',
    structureShift: 'None',
    entryType: 'Break',
    entryPrice: '',
    stopLoss: '',
    takeProfit: '',
    partialClosesEnabled: false,
    finalExitPrice: '',
    result: 'Win',
    setupGrade: 'B',
    notes: '',
  });

  // Fetch accounts when user is authenticated
  useEffect(() => {
    if (user) {
      fetchAccounts();
    } else {
      setLoadingAccounts(false);
    }
  }, [user]);

  useEffect(() => {
    calculatePnL();
  }, [formData.entryPrice, formData.takeProfit, formData.finalExitPrice, formData.stopLoss, formData.result, contracts, formData.direction, formData.partialClosesEnabled, partialCloses]);

  const fetchAccounts = async () => {
    if (!user) return;

    try {
      const response = await fetch(`/api/accounts?userId=${user.uid}`);
      const data = await response.json();
      if (data.success && data.accounts && data.accounts.length > 0) {
        setAccounts(data.accounts);
        if (!selectedAccount && data.accounts.length > 0) {
          setSelectedAccountId(data.accounts[0].id);
          setSelectedAccount(data.accounts[0]);
        }
      } else {
        setAccounts([]);
      }
    } catch (error) {
      console.error('Error fetching accounts:', error);
      setAccounts([]);
    } finally {
      setLoadingAccounts(false);
    }
  };

  const calculatePnL = () => {
    const entry = parseFloat(formData.entryPrice);
    const valuePerPoint = 10;
    
    if (!entry || !contracts) {
      setPnlCalculation(null);
      return;
    }
    
    let totalPnL = 0;
    let totalPoints = 0;
    
    if (formData.partialClosesEnabled) {
      partialCloses.forEach(close => {
        if (!close.price || !close.percentage || close.percentage === 0) return;
        
        const portionLots = (close.percentage / 100) * contracts;
        let points = 0;
        
        if (formData.direction === 'BUY') {
          points = close.price - entry;
        } else {
          points = entry - close.price;
        }
        
        const pnlForPortion = points * valuePerPoint * portionLots;
        totalPoints += points * (close.percentage / 100);
        totalPnL += pnlForPortion;
      });
      
      if (formData.finalExitPrice) {
        const totalPercentage = partialCloses.reduce((sum, c) => sum + (c.percentage || 0), 0);
        const remainingPercentage = Math.max(0, 100 - totalPercentage);
        
        if (remainingPercentage > 0) {
          const finalLots = (remainingPercentage / 100) * contracts;
          let finalPoints = 0;
          
          if (formData.direction === 'BUY') {
            finalPoints = parseFloat(formData.finalExitPrice) - entry;
          } else {
            finalPoints = entry - parseFloat(formData.finalExitPrice);
          }
          
          totalPoints += finalPoints * (remainingPercentage / 100);
          totalPnL += finalPoints * valuePerPoint * finalLots;
        }
      }
    } else {
      let exit = 0;
      if (formData.result === 'Loss') {
        exit = parseFloat(formData.stopLoss);
      } else {
        exit = formData.takeProfit ? parseFloat(formData.takeProfit) : 
               formData.finalExitPrice ? parseFloat(formData.finalExitPrice) : 0;
      }
      
      if (!exit) {
        setPnlCalculation(null);
        return;
      }
      
      let points = 0;
      if (formData.direction === 'BUY') {
        points = exit - entry;
      } else {
        points = entry - exit;
      }
      
      totalPoints = points;
      totalPnL = points * valuePerPoint * contracts;
    }
    
    setPnlCalculation({
      pointsDifference: totalPoints,
      pnlValue: totalPnL,
      isProfit: totalPnL > 0
    });
  };

  const calculateWeightedAverageExitPrice = () => {
    let totalValue = 0;
    let totalPercentage = 0;
    
    partialCloses.forEach(close => {
      if (close.percentage > 0 && close.price > 0) {
        totalValue += close.price * close.percentage;
        totalPercentage += close.percentage;
      }
    });
    
    const remainingPercentage = calculateRemainingPercentage();
    if (formData.partialClosesEnabled && remainingPercentage > 0 && formData.finalExitPrice) {
      totalValue += parseFloat(formData.finalExitPrice) * remainingPercentage;
      totalPercentage += remainingPercentage;
    }
    
    return totalPercentage > 0 ? totalValue / totalPercentage : 0;
  };

  const increaseContracts = () => {
    setContracts(prev => Math.round((prev + 0.1) * 10) / 10);
  };

  const decreaseContracts = () => {
    setContracts(prev => Math.max(0.01, Math.round((prev - 0.1) * 10) / 10));
  };

  const setContractValue = (value: number) => {
    setContracts(value);
  };

  const calculateTotalPercentage = () => {
    let total = 0;
    partialCloses.forEach(close => {
      if (close.percentage && close.percentage > 0) total += close.percentage;
    });
    return total;
  };

  const calculateRemainingPercentage = () => {
    let total = 0;
    partialCloses.forEach(close => {
      if (close.percentage && close.percentage > 0) total += close.percentage;
    });
    return Math.max(0, 100 - total);
  };

  const calculateRR = () => {
    const entry = parseFloat(formData.entryPrice);
    const stop = parseFloat(formData.stopLoss);
    
    if (!entry || !stop) return '0';
    
    const risk = Math.abs(entry - stop);
    let reward = 0;
    
    if (formData.partialClosesEnabled) {
      const avgExit = calculateWeightedAverageExitPrice();
      if (avgExit === 0) return '0';
      reward = Math.abs(avgExit - entry);
    } else {
      const take = formData.takeProfit ? parseFloat(formData.takeProfit) : 
                   formData.finalExitPrice ? parseFloat(formData.finalExitPrice) : 0;
      if (!take) return '0';
      reward = Math.abs(take - entry);
    }
    
    if (risk <= 0) return '0';
    return (reward / risk).toFixed(2);
  };

  const handleChange = (field: string, value: any) => {
    setFormData({ ...formData, [field]: value });
    setError('');
  };

  const addPartialClose = () => {
    const totalCurrent = calculateTotalPercentage();
    if (totalCurrent >= 100) {
      setError('Cannot add more partial closes. Total would exceed 100%');
      return;
    }
    setPartialCloses([...partialCloses, { id: Date.now().toString(), percentage: 0, price: 0 }]);
  };

  const removePartialClose = (id: string) => {
    if (partialCloses.length > 1) {
      setPartialCloses(partialCloses.filter(close => close.id !== id));
    }
  };

  const updatePartialClose = (id: string, field: keyof PartialClose, value: any) => {
    setPartialCloses(partialCloses.map(close => 
      close.id === id ? { ...close, [field]: value } : close
    ));
  };

  const compressImage = (base64: string, maxWidth: number = 1024): Promise<string> => {
    return new Promise((resolve, reject) => {
      if (typeof window === 'undefined') {
        resolve(base64);
        return;
      }
      const img = new window.Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        if (width > maxWidth) {
          height = (height * maxWidth) / width;
          width = maxWidth;
        }
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', 0.7));
        } else {
          resolve(base64);
        }
      };
      img.onerror = () => reject(new Error('Failed to load image'));
      img.src = base64;
    });
  };

  const handleScreenshotSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      setError('File too large. Max 10MB');
      return;
    }
    setLoading(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      try {
        let base64String = reader.result as string;
        if (base64String.length > 500000 && typeof window !== 'undefined') {
          base64String = await compressImage(base64String, 1024);
        }
        setScreenshotBase64(base64String);
        setScreenshotPreview(base64String);
        setError('');
      } catch (err) {
        setError('Failed to process image');
      } finally {
        setLoading(false);
      }
    };
    reader.onerror = () => {
      setError('Failed to read file');
      setLoading(false);
    };
    reader.readAsDataURL(file);
  };

  const removeScreenshot = () => {
    setScreenshotBase64('');
    setScreenshotPreview(null);
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleAccountSelect = (accountId: string) => {
    setSelectedAccountId(accountId);
    const account = accounts.find(a => a.id === accountId);
    setSelectedAccount(account || null);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Check if user is authenticated
    if (!user) {
      setError('❌ Please login first');
      return;
    }
    
    // Check if account exists
    if (!selectedAccountId || !selectedAccount) {
      setError('❌ No trading account found. Please create an account first.');
      document.querySelector('.bg-blue-50')?.scrollIntoView({ behavior: 'smooth' });
      return;
    }
    
    if (accounts.length === 0) {
      setError('❌ You need to create a trading account before adding trades.');
      setTimeout(() => {
        router.push('/accounts');
      }, 2000);
      return;
    }
    
    if (!formData.entryPrice || !formData.stopLoss) {
      setError('Please fill in entry price and stop loss');
      return;
    }
    
    if (formData.partialClosesEnabled) {
      const totalPercentage = calculateTotalPercentage();
      if (totalPercentage > 100) {
        setError(`Total position closed: ${totalPercentage}%. Cannot exceed 100%`);
        return;
      }
      if (totalPercentage === 0) {
        setError('Please add at least one partial close');
        return;
      }
    }

    setLoading(true);
    setError('');
    setSuccess('');

    try {
      const remainingPercentage = calculateRemainingPercentage();
      let exitPrice = null;
      let takeProfitValue = null;
      
      if (formData.partialClosesEnabled) {
        exitPrice = calculateWeightedAverageExitPrice();
        takeProfitValue = null;
      } else if (formData.result === 'Loss') {
        exitPrice = parseFloat(formData.stopLoss);
        takeProfitValue = null;
      } else {
        takeProfitValue = formData.takeProfit ? parseFloat(formData.takeProfit) : null;
        exitPrice = takeProfitValue;
      }
      
      const submitData = {
        userId: user.uid, // Use Firebase Auth UID
        accountId: selectedAccount.id,
        accountName: selectedAccount.name,
        date: formData.date,
        session: formData.session,
        direction: formData.direction,
        htfBias: formData.htfBias,
        liquiditySweep: formData.liquiditySweep,
        sweepType: formData.sweepType,
        sweepDetails: formData.sweepDetails,
        smt: formData.smt,
        htfSmt: formData.htfSmt,
        inducementLevel: formData.inducementLevel,
        structureShift: formData.structureShift,
        entryType: formData.entryType,
        entryPrice: parseFloat(formData.entryPrice),
        stopLoss: parseFloat(formData.stopLoss),
        takeProfit: takeProfitValue,
        finalExitPrice: formData.partialClosesEnabled ? (formData.finalExitPrice ? parseFloat(formData.finalExitPrice) : null) : null,
        partialClosesEnabled: formData.partialClosesEnabled,
        partialCloses: formData.partialClosesEnabled ? partialCloses : [],
        finalExitPercentage: formData.partialClosesEnabled ? remainingPercentage : 100,
        rr: parseFloat(calculateRR()),
        result: formData.result,
        setupGrade: formData.setupGrade,
        notes: formData.notes,
        screenshotBase64: screenshotBase64,
        contracts: contracts,
        pnlCalculated: pnlCalculation?.pnlValue || 0,
        weightedAvgExit: formData.partialClosesEnabled ? calculateWeightedAverageExitPrice() : null,
        createdAt: new Date().toISOString(),
      };
      
      const response = await fetch('/api/trades', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(submitData),
      });
      
      const data = await response.json();
      
      if (data.success) {
        setSuccess('✅ Trade saved successfully!');
        setTimeout(() => {
          router.push('/?refresh=true');
        }, 1500);
      } else {
        setError(data.error || 'Failed to save trade');
      }
    } catch (err: any) {
      console.error('Submit error:', err);
      setError(err.message || 'Failed to save trade');
    } finally {
      setLoading(false);
    }
  };

  const totalPercentage = calculateTotalPercentage();
  const remainingPercentage = calculateRemainingPercentage();
  const isValidTotal = totalPercentage <= 100 && totalPercentage > 0;
  const isSubmitDisabled = formData.partialClosesEnabled && (!isValidTotal || totalPercentage === 0);
  const avgExit = calculateWeightedAverageExitPrice();

  const getExitPriceDisplay = () => {
    if (formData.partialClosesEnabled) {
      return avgExit.toFixed(2);
    }
    if (formData.result === 'Loss') {
      return parseFloat(formData.stopLoss || '0').toFixed(2);
    }
    if (formData.takeProfit) return parseFloat(formData.takeProfit).toFixed(2);
    if (formData.finalExitPrice) return parseFloat(formData.finalExitPrice).toFixed(2);
    return '0.00';
  };

  if (loadingAccounts) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            <p className="text-gray-500 mt-4">Loading accounts...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <button
            type="button"
            onClick={() => router.push('/')}
            className="mb-4 flex items-center gap-2 text-gray-600 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Dashboard
          </button>
          <h1 className="text-3xl font-bold text-gray-900">New Trade Entry</h1>
          <p className="text-gray-600 mt-1">Record your NAS100 / ICT / SMC trading setup</p>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl text-red-700 flex items-center gap-2">
            <AlertCircle className="w-5 h-5" />
            {error}
          </div>
        )}
        
        {success && (
          <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 flex items-center gap-2">
            <CheckCircle className="w-5 h-5" />
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Account Selection */}
          <div className="bg-blue-50 p-4 rounded-xl border border-blue-200">
            <label className="block text-sm font-medium text-gray-700 mb-2 flex items-center gap-2">
              <Wallet className="w-4 h-4 text-primary-500" />
              Trading Account <span className="text-red-500">*</span>
            </label>
            {!user ? (
              <div className="text-center p-4 bg-yellow-50 rounded-lg">
                <p className="text-sm text-yellow-700">Please login to add trades</p>
              </div>
            ) : accounts.length === 0 ? (
              <div className="text-center p-6 bg-yellow-50 rounded-lg border-2 border-yellow-200">
                <Wallet className="w-12 h-12 text-yellow-500 mx-auto mb-3" />
                <p className="text-sm font-medium text-yellow-800 mb-2">No Trading Accounts Found</p>
                <p className="text-xs text-yellow-600 mb-4">You need an account before you can add trades</p>
                <button
                  type="button"
                  onClick={() => router.push('/accounts')}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 transition-colors text-sm"
                >
                  Create Your First Account →
                </button>
              </div>
            ) : (
              <>
                <select
                  value={selectedAccountId}
                  onChange={(e) => handleAccountSelect(e.target.value)}
                  className="input-primary"
                  required
                >
                  <option value="">-- Select a trading account --</option>
                  {accounts.map(account => (
                    <option key={account.id} value={account.id}>
                      {account.name} - {account.broker} (${account.currentBalance.toLocaleString()})
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Select which trading account this trade belongs to</p>
              </>
            )}
          </div>

          {/* Date & Session */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Calendar className="w-4 h-4 inline mr-2 text-primary-500" />
                Date
              </label>
              <input
                type="date"
                value={formData.date}
                onChange={(e) => handleChange('date', e.target.value)}
                className="input-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Clock className="w-4 h-4 inline mr-2 text-primary-500" />
                Session
              </label>
              <select
                value={formData.session}
                onChange={(e) => handleChange('session', e.target.value)}
                className="input-primary"
              >
                <option value="NY Open">NY Open (09:30 EST)</option>
                <option value="NY Mid">NY Mid (12:00 EST)</option>
                <option value="NY Close">NY Close (16:00 EST)</option>
                <option value="London Open">London Open (03:00 EST)</option>
                <option value="Asia Open">Asia Open (19:00 EST)</option>
              </select>
            </div>
          </div>

          {/* Direction & HTF Bias */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <TrendingUp className="w-4 h-4 inline mr-2 text-primary-500" />
                Direction
              </label>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => handleChange('direction', 'BUY')}
                  className={`flex-1 py-2.5 rounded-lg font-medium ${
                    formData.direction === 'BUY'
                      ? 'bg-green-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  📈 BUY (Long)
                </button>
                <button
                  type="button"
                  onClick={() => handleChange('direction', 'SELL')}
                  className={`flex-1 py-2.5 rounded-lg font-medium ${
                    formData.direction === 'SELL'
                      ? 'bg-red-500 text-white'
                      : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                  }`}
                >
                  📉 SELL (Short)
                </button>
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">HTF Bias</label>
              <select
                value={formData.htfBias}
                onChange={(e) => handleChange('htfBias', e.target.value)}
                className="input-primary"
              >
                <option value="Bullish">Bullish 📈</option>
                <option value="Bearish">Bearish 📉</option>
                <option value="No Trade">No Trade ⏸️</option>
              </select>
            </div>
          </div>

          {/* Liquidity Sweep & SMT */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Zap className="w-4 h-4 inline mr-2 text-primary-500" />
                Liquidity Sweep
              </label>
              <select
                value={formData.liquiditySweep}
                onChange={(e) => handleChange('liquiditySweep', e.target.value)}
                className="input-primary"
              >
                <option value="Yes">Yes ✅</option>
                <option value="No">No ❌</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <GitBranch className="w-4 h-4 inline mr-2 text-primary-500" />
                SMT (Smart Money Technique)
              </label>
              <select
                value={formData.smt}
                onChange={(e) => handleChange('smt', e.target.value)}
                className="input-primary"
              >
                <option value="No">No ❌</option>
                <option value="Yes - AMD">Yes - AMD</option>
                <option value="Yes - Divergence">Yes - Divergence</option>
                <option value="Yes - Hidden">Yes - Hidden SMT</option>
              </select>
            </div>
          </div>

          {/* Sweep Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Target className="w-4 h-4 inline mr-2 text-primary-500" />
              Sweep Type
            </label>
            <select
              value={formData.sweepType}
              onChange={(e) => handleChange('sweepType', e.target.value)}
              className="input-primary"
            >
              <option value="">Select sweep type</option>
              <optgroup label="🔍 INTERNAL LIQUIDITY SWEEPS">
                <option value="Internal - 1m Low">📊 Internal - 1 Minute Low</option>
                <option value="Internal - 5m Low">📊 Internal - 5 Minute Low</option>
                <option value="Internal - 15m Low">📊 Internal - 15 Minute Low</option>
                <option value="Internal - 30m Low">📊 Internal - 30 Minute Low</option>
                <option value="Internal - 1h Low">📊 Internal - 1 Hour Low</option>
                <option value="Internal - 4h Low">📊 Internal - 4 Hour Low</option>
                <option value="Internal - Imbalance">⚖️ Internal - Imbalance / FVG</option>
                <option value="Internal - Order Block">📦 Internal - Order Block</option>
                <option value="Internal - Fair Value Gap">🎯 Internal - Fair Value Gap</option>
                <option value="Internal - Liquidity Void">🌊 Internal - Liquidity Void</option>
              </optgroup>
              <optgroup label="🌍 EXTERNAL LIQUIDITY SWEEPS (HTF)">
                <option value="External - Previous Day High">📈 External - Previous Day High</option>
                <option value="External - Previous Day Low">📉 External - Previous Day Low</option>
                <option value="External - Previous Week High">📊 External - Previous Week High</option>
                <option value="External - Previous Week Low">📊 External - Previous Week Low</option>
                <option value="External - Previous Month High">📈 External - Previous Month High</option>
                <option value="External - Previous Month Low">📉 External - Previous Month Low</option>
                <option value="External - Quarterly Level">🎯 External - Quarterly Level</option>
                <option value="External - Yearly Level">📅 External - Yearly Level</option>
                <option value="External - Equal Highs">📊 External - Equal Highs</option>
                <option value="External - Equal Lows">📊 External - Equal Lows</option>
                <option value="External - Double Top">🔝 External - Double Top</option>
                <option value="External - Double Bottom">🔻 External - Double Bottom</option>
                <option value="External - Weekly Order Block">📦 External - Weekly Order Block</option>
                <option value="External - Monthly Order Block">📦 External - Monthly Order Block</option>
              </optgroup>
              <optgroup label="🔄 COMBINATION SWEEPS">
                <option value="Both - Internal + External">🔄 Both - Internal + External Sweep</option>
                <option value="Both - Multiple Timeframe Sweep">⏰ Both - Multiple Timeframe Sweep</option>
              </optgroup>
            </select>
          </div>

          {formData.sweepType && (
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Sweep Details (Optional)</label>
              <input
                type="text"
                placeholder="e.g., Swept 5m low + 15m low, then tapped into weekly OB"
                value={formData.sweepDetails}
                onChange={(e) => handleChange('sweepDetails', e.target.value)}
                className="input-primary"
              />
            </div>
          )}

          {/* HTF SMT */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              <Layers className="w-4 h-4 inline mr-2 text-primary-500" />
              HTF SMT (Higher Timeframe SMT)
            </label>
            <select
              value={formData.htfSmt}
              onChange={(e) => handleChange('htfSmt', e.target.value)}
              className="input-primary"
            >
              <option value="No">No ❌</option>
              <option value="Yes - 4H">Yes - 4H SMT</option>
              <option value="Yes - Daily">Yes - Daily SMT</option>
              <option value="Yes - Weekly">Yes - Weekly SMT</option>
              <option value="Yes - Monthly">Yes - Monthly SMT</option>
            </select>
          </div>

          {/* Inducement Level */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Inducement Level / MSS / CISD</label>
            <input
              type="text"
              placeholder="e.g., 1.618 FIB, Previous High, Order Block, MSS, CISD, BOS"
              value={formData.inducementLevel}
              onChange={(e) => handleChange('inducementLevel', e.target.value)}
              className="input-primary"
            />
          </div>

          {/* Structure Shift & Entry Type */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                <Shield className="w-4 h-4 inline mr-2 text-primary-500" />
                Structure Shift
              </label>
              <select
                value={formData.structureShift}
                onChange={(e) => handleChange('structureShift', e.target.value)}
                className="input-primary"
              >
                <option value="BOS">BOS (Break of Structure)</option>
                <option value="CISD">CISD (Change in State of Delivery)</option>
                <option value="MSS">MSS (Market Structure Shift)</option>
                <option value="CHoCH">CHoCH (Change of Character)</option>
                <option value="None">None</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Entry Type</label>
              <select
                value={formData.entryType}
                onChange={(e) => handleChange('entryType', e.target.value)}
                className="input-primary"
              >
                <option value="Break">Break Entry</option>
                <option value="Pullback">Pullback Entry</option>
                <option value="FVG">FVG Entry (Fair Value Gap)</option>
                <option value="OB">Order Block Entry</option>
                <option value="Mitigation">Mitigation Block Entry</option>
              </select>
            </div>
          </div>

          {/* Entry & Stop Loss */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Entry Price</label>
              <input
                type="number"
                step="0.25"
                placeholder="Enter price"
                value={formData.entryPrice}
                onChange={(e) => handleChange('entryPrice', e.target.value)}
                className="input-primary"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Stop Loss</label>
              <input
                type="number"
                step="0.25"
                placeholder="Stop loss price"
                value={formData.stopLoss}
                onChange={(e) => handleChange('stopLoss', e.target.value)}
                className="input-primary"
                required
              />
            </div>
          </div>

          {/* PnL Calculator */}
          <div className="border border-gray-200 rounded-xl p-4 bg-gradient-to-r from-blue-50 to-purple-50">
            <h3 className="font-semibold mb-3">📊 PnL Calculator ($10/point)</h3>
            
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Contract Size</label>
                <div className="flex items-center gap-2">
                  <button type="button" onClick={decreaseContracts} className="w-8 h-8 bg-gray-200 rounded-lg hover:bg-gray-300">-</button>
                  <input type="number" step="0.01" min="0.01" value={contracts} onChange={(e) => setContracts(parseFloat(e.target.value) || 0.01)} className="w-24 text-center input-primary py-1" />
                  <button type="button" onClick={increaseContracts} className="w-8 h-8 bg-gray-200 rounded-lg hover:bg-gray-300">+</button>
                </div>
                <div className="flex flex-wrap gap-2 mt-2">
                  <button type="button" onClick={() => setContractValue(0.1)} className="px-2 py-1 text-xs bg-gray-100 rounded">0.1</button>
                  <button type="button" onClick={() => setContractValue(0.5)} className="px-2 py-1 text-xs bg-gray-100 rounded">0.5</button>
                  <button type="button" onClick={() => setContractValue(1)} className="px-2 py-1 text-xs bg-primary-100 rounded">1</button>
                  <button type="button" onClick={() => setContractValue(2)} className="px-2 py-1 text-xs bg-gray-100 rounded">2</button>
                </div>
              </div>
              <div><label className="text-sm font-medium">Entry Price</label><div className="text-lg font-semibold">${parseFloat(formData.entryPrice || '0').toFixed(2)}</div></div>
              <div><label className="text-sm font-medium">Exit/Weighted Avg</label><div className="text-lg font-semibold">${getExitPriceDisplay()}</div></div>
              <div><label className="text-sm font-medium">Direction</label><div className={`text-lg font-semibold ${formData.direction === 'BUY' ? 'text-green-600' : 'text-red-600'}`}>{formData.direction === 'BUY' ? '📈 LONG' : '📉 SHORT'}</div></div>
            </div>
            
            {pnlCalculation && (
              <div className={`p-4 rounded-lg ${pnlCalculation.isProfit ? 'bg-green-100' : 'bg-red-100'}`}>
                <div className="grid grid-cols-3 gap-4">
                  <div><p className="text-xs text-gray-600">Avg Points</p><p className={`text-xl font-bold ${pnlCalculation.isProfit ? 'text-green-700' : 'text-red-700'}`}>{pnlCalculation.pointsDifference > 0 ? '+' : ''}{pnlCalculation.pointsDifference.toFixed(2)}</p></div>
                  <div><p className="text-xs text-gray-600">Value/pt</p><p className="text-xl font-bold">$10.00</p></div>
                  <div><p className="text-xs text-gray-600">Total P&L</p><p className={`text-2xl font-bold ${pnlCalculation.isProfit ? 'text-green-700' : 'text-red-700'}`}>{pnlCalculation.isProfit ? '+' : '-'}${Math.abs(pnlCalculation.pnlValue).toLocaleString()}</p></div>
                </div>
              </div>
            )}
          </div>

          {/* Partial Closes Section */}
          <div className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-center justify-between mb-4">
              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={formData.partialClosesEnabled}
                  onChange={(e) => handleChange('partialClosesEnabled', e.target.checked)}
                  className="w-4 h-4 text-primary-500 rounded"
                />
                <span className="text-sm font-medium text-gray-700 flex items-center gap-2">
                  <Percent className="w-4 h-4 text-primary-500" />
                  Multiple Partial Closes
                </span>
              </label>
              {formData.partialClosesEnabled && totalPercentage < 100 && (
                <button type="button" onClick={addPartialClose} className="text-sm text-primary-500 hover:text-primary-600 flex items-center gap-1">
                  <Plus className="w-4 h-4" /> Add Exit
                </button>
              )}
            </div>

            {formData.partialClosesEnabled ? (
              <div className="space-y-4">
                {partialCloses.map((close) => (
                  <div key={close.id} className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-5">
                      <label className="text-xs text-gray-500">Exit %</label>
                      <input type="number" step="1" min="1" max="100" value={close.percentage || ''} onChange={(e) => updatePartialClose(close.id, 'percentage', parseFloat(e.target.value) || 0)} className="input-primary text-sm" />
                    </div>
                    <div className="col-span-6">
                      <label className="text-xs text-gray-500">Exit Price</label>
                      <input type="number" step="0.25" value={close.price || ''} onChange={(e) => updatePartialClose(close.id, 'price', parseFloat(e.target.value) || 0)} className="input-primary text-sm" />
                    </div>
                    <div className="col-span-1">
                      {partialCloses.length > 1 && (
                        <button type="button" onClick={() => removePartialClose(close.id)} className="text-red-500">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                ))}
                
                <div className="border-t border-gray-200 pt-4">
                  <div className="grid grid-cols-12 gap-3 items-end">
                    <div className="col-span-5">
                      <label className="text-xs text-gray-500">Final Exit</label>
                      <div className="bg-blue-50 p-2 rounded text-sm font-medium">
                        {remainingPercentage}% of position
                      </div>
                    </div>
                    <div className="col-span-6">
                      <label className="text-xs text-gray-500">Final Exit Price</label>
                      <input type="number" step="0.25" placeholder="Final exit price" value={formData.finalExitPrice} onChange={(e) => handleChange('finalExitPrice', e.target.value)} className="input-primary text-sm" />
                    </div>
                  </div>
                </div>

                <div className={`p-3 rounded text-sm ${totalPercentage === 100 ? 'bg-green-50' : totalPercentage > 0 ? 'bg-yellow-50' : 'bg-gray-50'}`}>
                  <strong>Total Position:</strong> {totalPercentage}% / 100%
                  {totalPercentage === 100 && <span className="ml-2 text-green-600">✓ Complete</span>}
                  {totalPercentage > 100 && <span className="ml-2 text-red-600">⚠️ Exceeds by {totalPercentage - 100}%</span>}
                  {totalPercentage < 100 && totalPercentage > 0 && <span className="ml-2 text-yellow-600">Need {100 - totalPercentage}% more</span>}
                </div>
                
                {avgExit > 0 && (
                  <div className="bg-blue-50 p-2 rounded text-sm text-center">
                    Weighted Average Exit: ${avgExit.toFixed(2)}
                  </div>
                )}
              </div>
            ) : (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">Take Profit (Full Close)</label>
                <input type="number" step="0.25" placeholder="Take profit price" value={formData.takeProfit} onChange={(e) => handleChange('takeProfit', e.target.value)} className="input-primary" />
              </div>
            )}
          </div>

          {/* RR Display */}
          <div className="bg-blue-50 p-4 rounded-xl">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium text-gray-700">Risk/Reward Ratio:</span>
              <span className="text-2xl font-bold text-primary-600">1:{calculateRR()}</span>
            </div>
          </div>

          {/* Result & Grade */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Result</label>
              <select value={formData.result} onChange={(e) => handleChange('result', e.target.value)} className="input-primary">
                <option value="Win">Win 🎉</option>
                <option value="Loss">Loss 💔</option>
                <option value="Breakeven">Breakeven 🤝</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Setup Grade</label>
              <select value={formData.setupGrade} onChange={(e) => handleChange('setupGrade', e.target.value)} className="input-primary">
                <option value="A+">A+ - Perfect</option>
                <option value="A">A - Great</option>
                <option value="B">B - Good</option>
                <option value="C">C - Poor</option>
              </select>
            </div>
          </div>

          {/* Screenshot */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Screenshot</label>
            <div className="relative">
              <input type="file" ref={fileInputRef} accept="image/*" onChange={handleScreenshotSelect} className="hidden" id="screenshot-upload" />
              {!screenshotPreview ? (
                <label htmlFor="screenshot-upload" className="flex flex-col items-center justify-center gap-2 p-6 border-2 border-dashed border-gray-300 rounded-xl cursor-pointer hover:border-primary-500 bg-gray-50">
                  <Camera className="w-10 h-10 text-gray-400" />
                  <span className="text-sm text-gray-500">Click to upload chart screenshot</span>
                </label>
              ) : (
                <div className="relative group">
                  <img src={screenshotPreview} alt="Preview" className="w-full h-48 object-cover rounded-xl border" />
                  <button type="button" onClick={removeScreenshot} className="absolute top-2 right-2 p-1 bg-red-500 text-white rounded-full">
                    <X className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>

          {/* Notes */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Notes</label>
            <textarea rows={4} placeholder="Add your trading notes..." value={formData.notes} onChange={(e) => handleChange('notes', e.target.value)} className="input-primary resize-none" />
          </div>

          {/* Buttons */}
          <div className="flex gap-4 pt-4">
            <button type="button" onClick={() => router.push('/')} className="flex-1 px-6 py-3 bg-gray-100 rounded-xl hover:bg-gray-200 transition-colors">
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={loading || isSubmitDisabled || !selectedAccount || accounts.length === 0 || !user} 
              className="flex-1 px-6 py-3 bg-primary-500 text-white rounded-xl flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin" /> : <Save className="w-5 h-5" />}
              Save Trade
            </button>
          </div>
        </form>
      </div>
    </Layout>
  );
}