'use client';

import { useState, useMemo, useEffect } from 'react';
import Layout from '@/components/layout/Layout';
import { useTradingData } from '@/hooks/useTradingData';
import { useAuth } from '@/context/AuthContext';
import {
  Brain, Heart, AlertCircle, BookOpen, Edit3, Save, X, 
  BarChart3, Activity, Shield, RefreshCw, CheckCircle
} from 'lucide-react';

interface PsychologyEntry {
  id: string;
  tradeId: string;
  date: string;
  emotions: string[];
  mistakes: string[];
  notes: string;
  discipline: number;
  confidence: number;
  sleepQuality: number;
  preTradeRoutine: boolean;
  followedPlan: boolean;
}

interface TradeWithEntry {
  trade: {
    id: string;
    date: string;
    direction: string;
    pnlCalculated: number;
    result: string;
  };
  entry: PsychologyEntry;
}

const EMOTIONS = [
  { value: 'calm', label: '😌 Calm', color: 'bg-green-100 text-green-700' },
  { value: 'fear', label: '😨 Fear', color: 'bg-red-100 text-red-700' },
  { value: 'greed', label: '💰 Greed', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'revenge', label: '⚔️ Revenge', color: 'bg-orange-100 text-orange-700' },
  { value: 'excited', label: '🤩 Excited', color: 'bg-purple-100 text-purple-700' },
  { value: 'anxious', label: '😰 Anxious', color: 'bg-red-100 text-red-700' },
  { value: 'confident', label: '💪 Confident', color: 'bg-blue-100 text-blue-700' },
  { value: 'doubt', label: '🤔 Doubt', color: 'bg-gray-100 text-gray-700' },
  { value: 'impatient', label: '⏰ Impatient', color: 'bg-yellow-100 text-yellow-700' },
  { value: 'frustrated', label: '😤 Frustrated', color: 'bg-red-100 text-red-700' },
];

const MISTAKES = [
  { value: 'early_entry', label: 'Early Entry' },
  { value: 'late_exit', label: 'Late Exit' },
  { value: 'no_stop', label: 'No Stop Loss' },
  { value: 'too_big_position', label: 'Position Too Large' },
  { value: 'fomo_entry', label: 'FOMO Entry' },
  { value: 'chasing_price', label: 'Chasing Price' },
  { value: 'ignoring_plan', label: 'Ignored Trading Plan' },
  { value: 'overtrading', label: 'Overtrading' },
  { value: 'moving_stops', label: 'Moved Stop Loss' },
  { value: 'adding_to_loser', label: 'Added to Loser' },
  { value: 'bad_rr', label: 'Poor Risk/Reward' },
];

export default function PsychologyPage() {
  const { user } = useAuth();
  const { allTrades, loading, refreshData } = useTradingData();
  const [psychologyEntries, setPsychologyEntries] = useState<PsychologyEntry[]>([]);
  const [editingEntry, setEditingEntry] = useState<PsychologyEntry | null>(null);
  const [viewMode, setViewMode] = useState<'list' | 'stats'>('list');
  const [isLoading, setIsLoading] = useState(true);

  // Load psychology entries from API with userId
  const loadEntries = async () => {
    if (!user) {
      console.log('No user logged in');
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      const response = await fetch(`/api/psychology?userId=${user.uid}`);
      const data = await response.json();
      if (data.success) {
        setPsychologyEntries(data.entries || []);
        console.log('Loaded psychology entries:', data.entries?.length);
      }
    } catch (error) {
      console.error('Failed to load psychology entries:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadEntries();
  }, [user]);

  // Get trades with psychology entries
  const tradesWithEntries = useMemo((): TradeWithEntry[] => {
    const result: TradeWithEntry[] = [];
    
    for (const entry of psychologyEntries) {
      const tradeData = allTrades.find(t => t.id === entry.tradeId);
      if (tradeData) {
        result.push({
          trade: {
            id: tradeData.id,
            date: tradeData.date,
            direction: tradeData.direction === 'BUY' ? 'LONG' : 'SHORT',
            pnlCalculated: tradeData.pnlCalculated || 0,
            result: tradeData.result || (tradeData.pnlCalculated >= 0 ? 'Win' : 'Loss'),
          },
          entry: entry
        });
      }
    }
    
    return result.sort((a, b) => new Date(b.trade.date).getTime() - new Date(a.trade.date).getTime());
  }, [psychologyEntries, allTrades]);

  // Get trades without psychology entries
  const tradesWithoutEntries = useMemo(() => {
    const existingIds = new Set(psychologyEntries.map(e => e.tradeId));
    return allTrades.filter(t => !existingIds.has(t.id));
  }, [allTrades, psychologyEntries]);

  // Calculate psychology stats
  const psychologyStats = useMemo(() => {
    if (psychologyEntries.length === 0) return null;

    const avgDiscipline = psychologyEntries.reduce((sum, e) => sum + e.discipline, 0) / psychologyEntries.length;
    const avgConfidence = psychologyEntries.reduce((sum, e) => sum + e.confidence, 0) / psychologyEntries.length;
    
    const emotionCounts: { [key: string]: number } = {};
    psychologyEntries.forEach(e => {
      e.emotions.forEach(em => {
        emotionCounts[em] = (emotionCounts[em] || 0) + 1;
      });
    });
    
    const mistakeCounts: { [key: string]: number } = {};
    psychologyEntries.forEach(e => {
      e.mistakes.forEach(m => {
        mistakeCounts[m] = (mistakeCounts[m] || 0) + 1;
      });
    });
    
    const planFollowed = psychologyEntries.filter(e => e.followedPlan).length;
    const planRate = (planFollowed / psychologyEntries.length) * 100;
    
    const routineFollowed = psychologyEntries.filter(e => e.preTradeRoutine).length;
    const routineRate = (routineFollowed / psychologyEntries.length) * 100;
    
    const disciplinedWins = psychologyEntries.filter(e => {
      const tradeData = allTrades.find(t => t.id === e.tradeId);
      return tradeData?.result === 'Win' && e.discipline >= 7;
    }).length;
    
    return {
      avgDiscipline: avgDiscipline.toFixed(1),
      avgConfidence: avgConfidence.toFixed(1),
      topEmotions: Object.entries(emotionCounts).sort((a, b) => b[1] - a[1]).slice(0, 3),
      topMistakes: Object.entries(mistakeCounts).sort((a, b) => b[1] - a[1]).slice(0, 3),
      planRate: planRate.toFixed(0),
      routineRate: routineRate.toFixed(0),
      disciplinedWins,
      totalEntries: psychologyEntries.length
    };
  }, [psychologyEntries, allTrades]);

  // Create new psychology entry
  const createEntry = (tradeId: string) => {
    const tradeData = allTrades.find(t => t.id === tradeId);
    const newEntry: PsychologyEntry = {
      id: '',
      tradeId,
      date: tradeData?.date || new Date().toISOString().split('T')[0],
      emotions: [],
      mistakes: [],
      notes: '',
      discipline: 7,
      confidence: 7,
      sleepQuality: 7,
      preTradeRoutine: false,
      followedPlan: false
    };
    setEditingEntry(newEntry);
  };

  // Save entry with userId
  const saveEntry = async () => {
    if (editingEntry && user) {
      const response = await fetch('/api/psychology', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...editingEntry,
          userId: user.uid
        }),
      });
      const data = await response.json();
      if (data.success) {
        setEditingEntry(null);
        await loadEntries();
      } else {
        alert('Failed to save entry: ' + (data.error || 'Unknown error'));
      }
    }
  };

  // Delete entry with userId
  const deleteEntry = async (id: string) => {
    if (!user) return;
    
    if (confirm('Are you sure you want to delete this journal entry?')) {
      const response = await fetch(`/api/psychology?id=${id}&userId=${user.uid}`, { 
        method: 'DELETE' 
      });
      const data = await response.json();
      if (data.success) {
        await loadEntries();
      } else {
        alert('Failed to delete entry: ' + (data.error || 'Unknown error'));
      }
    }
  };

  const getEmotionLabel = (value: string) => {
    return EMOTIONS.find(e => e.value === value)?.label || value;
  };

  const getMistakeLabel = (value: string) => {
    return MISTAKES.find(m => m.value === value)?.label || value;
  };

  // Close modal when clicking outside
  const handleModalClose = () => {
    setEditingEntry(null);
  };

  if (loading || isLoading) {
    return (
      <Layout>
        <div className="flex items-center justify-center h-96">
          <div className="text-center">
            <div className="inline-block animate-spin rounded-full h-12 w-12 border-4 border-primary-500 border-t-transparent"></div>
            <p className="text-gray-500 mt-4">Loading psychology data...</p>
          </div>
        </div>
      </Layout>
    );
  }

  return (
    <Layout>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-center">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
              <Brain className="w-6 h-6 text-purple-500" />
              Trade Psychology & Journal
            </h1>
            <p className="text-gray-500 mt-1">Track emotions, learn from mistakes, improve discipline</p>
          </div>
          <button
            onClick={() => { refreshData(); loadEntries(); }}
            className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
            title="Refresh"
          >
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>

        {/* View Toggle */}
        <div className="mb-6 flex gap-2">
          <button
            onClick={() => setViewMode('list')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              viewMode === 'list' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Journal Entries ({psychologyEntries.length})
          </button>
          <button
            onClick={() => setViewMode('stats')}
            className={`px-4 py-2 rounded-lg text-sm font-medium flex items-center gap-2 ${
              viewMode === 'stats' ? 'bg-primary-500 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Psychology Stats
          </button>
        </div>

        {/* Stats View */}
        {viewMode === 'stats' && psychologyStats && (
          <div className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="bg-white rounded-xl p-5 border border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Avg Discipline</p>
                <p className="text-3xl font-bold text-purple-600">{psychologyStats.avgDiscipline}/10</p>
              </div>
              <div className="bg-white rounded-xl p-5 border border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Plan Adherence</p>
                <p className="text-3xl font-bold text-blue-600">{psychologyStats.planRate}%</p>
              </div>
              <div className="bg-white rounded-xl p-5 border border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Pre-Trade Routine</p>
                <p className="text-3xl font-bold text-green-600">{psychologyStats.routineRate}%</p>
              </div>
              <div className="bg-white rounded-xl p-5 border border-gray-200">
                <p className="text-sm text-gray-500 mb-1">Journal Entries</p>
                <p className="text-3xl font-bold text-orange-600">{psychologyStats.totalEntries}</p>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Heart className="w-5 h-5 text-pink-500" />
                  Top Emotions
                </h3>
                {psychologyStats.topEmotions.map(([emotion, count]) => (
                  <div key={emotion} className="flex items-center justify-between py-2">
                    <span className="text-gray-700">{getEmotionLabel(emotion)}</span>
                    <span className="text-sm font-medium text-gray-600">{count} times</span>
                  </div>
                ))}
              </div>

              <div className="bg-white rounded-xl border border-gray-200 p-6">
                <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-red-500" />
                  Common Mistakes
                </h3>
                {psychologyStats.topMistakes.map(([mistake, count]) => (
                  <div key={mistake} className="flex items-center justify-between py-2">
                    <span className="text-gray-700">{getMistakeLabel(mistake)}</span>
                    <span className="text-sm font-medium text-gray-600">{count} times</span>
                  </div>
                ))}
              </div>
            </div>

            <div className="bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl p-6 border border-purple-200">
              <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                <Shield className="w-5 h-5 text-purple-600" />
                Discipline Impact
              </h3>
              <p className="text-2xl font-bold text-green-600">{psychologyStats.disciplinedWins}</p>
              <p className="text-xs text-gray-600">Wins with high discipline (7+)</p>
            </div>
          </div>
        )}

        {/* Journal Entries View */}
        {viewMode === 'list' && (
          <>
            {/* Pending Journal Entries */}
            {tradesWithoutEntries.length > 0 && (
              <div className="mb-8">
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <Edit3 className="w-4 h-4 text-orange-500" />
                  Add Journal Entry ({tradesWithoutEntries.length} pending)
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                  {tradesWithoutEntries.map(trade => (
                    <button
                      key={trade.id}
                      onClick={() => createEntry(trade.id)}
                      className="flex items-center justify-between p-4 bg-gray-50 rounded-lg hover:bg-gray-100 transition-colors text-left"
                    >
                      <div>
                        <p className="font-medium text-gray-900">
                          {trade.direction === 'BUY' ? '📈 LONG' : '📉 SHORT'} - {trade.date}
                        </p>
                        <p className={`text-sm font-semibold ${trade.pnlCalculated >= 0 ? 'text-green-600' : 'text-red-600'}`}>
                          ${trade.pnlCalculated?.toLocaleString()}
                        </p>
                      </div>
                      <div className="text-primary-500 text-sm">+ Journal →</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Existing Journal Entries */}
            {tradesWithEntries.length > 0 && (
              <div>
                <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                  <BookOpen className="w-4 h-4 text-purple-500" />
                  Journal Entries ({tradesWithEntries.length})
                </h3>
                <div className="space-y-4">
                  {tradesWithEntries.map((item) => (
                    <div key={item.entry.id} className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-md transition-shadow">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                              item.trade.result === 'Win' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {item.trade.result}
                            </span>
                            <span className="text-xs text-gray-500">{item.entry.date}</span>
                          </div>
                          <p className="font-medium text-gray-900">
                            {item.trade.direction} - 
                            <span className={item.trade.pnlCalculated >= 0 ? 'text-green-600' : 'text-red-600'}>
                              {' '}${item.trade.pnlCalculated.toLocaleString()}
                            </span>
                          </p>
                        </div>
                        <div className="flex gap-2">
                          <button
                            onClick={() => setEditingEntry(item.entry)}
                            className="p-1 text-gray-400 hover:text-blue-500"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteEntry(item.entry.id)}
                            className="p-1 text-gray-400 hover:text-red-500"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                      
                      {item.entry.emotions.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-1">Emotions:</p>
                          <div className="flex flex-wrap gap-2">
                            {item.entry.emotions.map(em => (
                              <span key={em} className="px-2 py-1 rounded-full text-xs bg-pink-50 text-pink-700">
                                {getEmotionLabel(em)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {item.entry.mistakes.length > 0 && (
                        <div className="mb-3">
                          <p className="text-xs text-gray-500 mb-1">Mistakes:</p>
                          <div className="flex flex-wrap gap-2">
                            {item.entry.mistakes.map(m => (
                              <span key={m} className="px-2 py-1 rounded-full text-xs bg-red-50 text-red-700">
                                {getMistakeLabel(m)}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {item.entry.notes && (
                        <p className="text-sm text-gray-600 mb-3 italic">"{item.entry.notes}"</p>
                      )}
                      
                      <div className="flex flex-wrap gap-4 text-xs text-gray-500">
                        <span>💪 Discipline: {item.entry.discipline}/10</span>
                        <span>🎯 Confidence: {item.entry.confidence}/10</span>
                        <span>😴 Sleep: {item.entry.sleepQuality}/10</span>
                        {item.entry.followedPlan && <span className="text-green-600">✓ Followed plan</span>}
                        {item.entry.preTradeRoutine && <span className="text-blue-600">✓ Pre-trade routine</span>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}

        {/* Edit/Create Modal */}
        {editingEntry && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4" onClick={handleModalClose}>
            <div className="bg-white rounded-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
              <div className="sticky top-0 bg-white border-b border-gray-200 p-4 flex justify-between items-center">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingEntry.id ? 'Edit Journal Entry' : 'New Journal Entry'}
                </h2>
                <button onClick={handleModalClose} className="p-1 hover:bg-gray-100 rounded-lg">
                  <X className="w-5 h-5" />
                </button>
              </div>
              
              <div className="p-6 space-y-5">
                {/* Emotions */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Emotions You Felt</label>
                  <div className="flex flex-wrap gap-2">
                    {EMOTIONS.map(emotion => (
                      <button
                        key={emotion.value}
                        type="button"
                        onClick={() => {
                          const newEmotions = editingEntry.emotions.includes(emotion.value)
                            ? editingEntry.emotions.filter(e => e !== emotion.value)
                            : [...editingEntry.emotions, emotion.value];
                          setEditingEntry({ ...editingEntry, emotions: newEmotions });
                        }}
                        className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                          editingEntry.emotions.includes(emotion.value)
                            ? emotion.color
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {emotion.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Mistakes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Mistakes Made</label>
                  <div className="flex flex-wrap gap-2">
                    {MISTAKES.map(mistake => (
                      <button
                        key={mistake.value}
                        type="button"
                        onClick={() => {
                          const newMistakes = editingEntry.mistakes.includes(mistake.value)
                            ? editingEntry.mistakes.filter(m => m !== mistake.value)
                            : [...editingEntry.mistakes, mistake.value];
                          setEditingEntry({ ...editingEntry, mistakes: newMistakes });
                        }}
                        className={`px-3 py-1.5 rounded-full text-sm transition-colors ${
                          editingEntry.mistakes.includes(mistake.value)
                            ? 'bg-red-100 text-red-700'
                            : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                        }`}
                      >
                        {mistake.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">Journal Notes</label>
                  <textarea
                    value={editingEntry.notes}
                    onChange={(e) => setEditingEntry({ ...editingEntry, notes: e.target.value })}
                    rows={4}
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
                    placeholder="What did you learn? What would you do differently?"
                  />
                </div>

                {/* Rating Scales */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Discipline (1-10)</label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={editingEntry.discipline}
                      onChange={(e) => setEditingEntry({ ...editingEntry, discipline: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <p className="text-center text-sm font-medium mt-1">{editingEntry.discipline}/10</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Confidence (1-10)</label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={editingEntry.confidence}
                      onChange={(e) => setEditingEntry({ ...editingEntry, confidence: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <p className="text-center text-sm font-medium mt-1">{editingEntry.confidence}/10</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Sleep Quality (1-10)</label>
                    <input
                      type="range"
                      min="1"
                      max="10"
                      value={editingEntry.sleepQuality}
                      onChange={(e) => setEditingEntry({ ...editingEntry, sleepQuality: parseInt(e.target.value) })}
                      className="w-full"
                    />
                    <p className="text-center text-sm font-medium mt-1">{editingEntry.sleepQuality}/10</p>
                  </div>
                </div>

                {/* Checkboxes */}
                <div className="flex gap-6">
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingEntry.preTradeRoutine}
                      onChange={(e) => setEditingEntry({ ...editingEntry, preTradeRoutine: e.target.checked })}
                      className="w-4 h-4 text-primary-500 rounded"
                    />
                    <span className="text-sm text-gray-700">Completed pre-trade routine</span>
                  </label>
                  <label className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      checked={editingEntry.followedPlan}
                      onChange={(e) => setEditingEntry({ ...editingEntry, followedPlan: e.target.checked })}
                      className="w-4 h-4 text-primary-500 rounded"
                    />
                    <span className="text-sm text-gray-700">Followed trading plan</span>
                  </label>
                </div>
              </div>

              <div className="sticky bottom-0 bg-white border-t border-gray-200 p-4 flex justify-end gap-3">
                <button
                  onClick={handleModalClose}
                  className="px-4 py-2 text-gray-600 hover:text-gray-800 rounded-lg"
                >
                  Cancel
                </button>
                <button
                  onClick={saveEntry}
                  className="px-4 py-2 bg-primary-500 text-white rounded-lg hover:bg-primary-600 flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  Save Journal Entry
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </Layout>
  );
}