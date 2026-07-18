import React, { useState } from 'react';
import { Button } from './Button';
import { 
  Atom, 
  Cpu, 
  Wind, 
  Activity, 
  Anchor, 
  Zap, 
  BookOpen, 
  ArrowLeft, 
  FileText, 
  Play 
} from 'lucide-react';

interface GateExplorerProps {
  onSelectTopic: (topic: string) => void;
  onBack: () => void;
}

const BRANCHES = [
  { id: 'AE', name: 'Aerospace Engineering', icon: Wind, color: 'text-sky-500', bg: 'bg-sky-50' },
  { id: 'PH', name: 'Physics', icon: Atom, color: 'text-purple-500', bg: 'bg-purple-50' },
  { id: 'CS', name: 'Computer Science', icon: Cpu, color: 'text-blue-500', bg: 'bg-blue-50' },
  { id: 'EE', name: 'Electrical Engineering', icon: Zap, color: 'text-yellow-500', bg: 'bg-yellow-50' },
  { id: 'EC', name: 'Electronics & Comm.', icon: Activity, color: 'text-green-500', bg: 'bg-green-50' },
  { id: 'CE', name: 'Civil Engineering', icon: Anchor, color: 'text-orange-500', bg: 'bg-orange-50' },
];

const YEARS = [2024, 2023, 2022, 2021, 2020, 2019];

export const GateExplorer: React.FC<GateExplorerProps> = ({ onSelectTopic, onBack }) => {
  const [selectedBranch, setSelectedBranch] = useState<typeof BRANCHES[0] | null>(null);

  if (!selectedBranch) {
    return (
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
        <div className="mb-8 flex items-center gap-4">
          <Button variant="secondary" onClick={onBack} className="shrink-0">
            <ArrowLeft className="w-4 h-4 mr-2" /> Back
          </Button>
          <div>
            <h1 className="text-3xl font-bold text-slate-900">GATE Repository</h1>
            <p className="text-slate-500">Select a branch to access Previous Year Questions (PYQs).</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {BRANCHES.map((branch) => (
            <div 
              key={branch.id}
              onClick={() => setSelectedBranch(branch)}
              className="group bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-lg transition-all cursor-pointer p-6 flex flex-col items-center text-center"
            >
              <div className={`w-16 h-16 rounded-full flex items-center justify-center mb-4 ${branch.bg} group-hover:scale-110 transition-transform`}>
                <branch.icon className={`w-8 h-8 ${branch.color}`} />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-1">{branch.name}</h3>
              <p className="text-sm text-slate-400 font-medium">GATE {branch.id}</p>
              <div className="mt-6 w-full pt-4 border-t border-slate-100 flex justify-center text-brand-600 font-medium text-sm group-hover:underline">
                View Papers &rarr;
              </div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 animate-in fade-in slide-in-from-right-8 duration-300">
      <div className="mb-8 flex items-center gap-4">
        <Button variant="secondary" onClick={() => setSelectedBranch(null)} className="shrink-0">
          <ArrowLeft className="w-4 h-4 mr-2" /> Back to Branches
        </Button>
        <div className="flex items-center gap-3">
            <div className={`p-2 rounded-lg ${selectedBranch.bg}`}>
                <selectedBranch.icon className={`w-6 h-6 ${selectedBranch.color}`} />
            </div>
            <div>
                <h1 className="text-2xl font-bold text-slate-900">{selectedBranch.name}</h1>
                <p className="text-slate-500">Previous Year Question Archive</p>
            </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {YEARS.map((year) => (
          <div 
            key={year} 
            className="bg-white rounded-lg border border-slate-200 p-5 hover:border-brand-300 hover:shadow-md transition-all group"
          >
            <div className="flex justify-between items-start mb-4">
                <div className="p-2 bg-slate-100 rounded text-slate-600">
                    <FileText className="w-6 h-6" />
                </div>
                <span className="text-xs font-bold px-2 py-1 bg-brand-50 text-brand-700 rounded-full">PYQ</span>
            </div>
            <h4 className="text-lg font-bold text-slate-900 mb-2">GATE {year}</h4>
            <p className="text-xs text-slate-500 mb-4">{selectedBranch.name} Paper</p>
            
            <Button 
                onClick={() => onSelectTopic(`GATE ${selectedBranch.name} ${year} Exam`)} 
                className="w-full"
            >
                <Play className="w-4 h-4 mr-2 fill-current" /> Attempt Now
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
};
