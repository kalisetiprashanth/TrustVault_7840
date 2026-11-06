import React, { useState, useRef } from 'react';
import { useAuth } from '../context/AuthContext.tsx';
import { UploadCloud, File, AlertCircle, CheckCircle, X, Shield, Lock } from 'lucide-react';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onUploadSuccess: () => void;
}

export const UploadModal: React.FC<UploadModalProps> = ({ isOpen, onClose, onUploadSuccess }) => {
  const { user } = useAuth();
  const [file, setFile] = useState<File | null>(null);
  const [category, setCategory] = useState('Financial');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successInfo, setSuccessInfo] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  if (!isOpen) return null;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selected = e.target.files[0];
      if (selected.size > 25 * 1024 * 1024) {
        setError('File exceeds 25 MB limit');
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      const selected = e.dataTransfer.files[0];
      if (selected.size > 25 * 1024 * 1024) {
        setError('File exceeds 25 MB limit');
        return;
      }
      setFile(selected);
      setError(null);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a file to upload');
      return;
    }

    setUploading(true);
    setError(null);

    const formData = new FormData();
    formData.append('file', file);
    formData.append('category', category);

    try {
      const res = await fetch('/api/documents/upload', {
        method: 'POST',
        headers: {
          'x-trustvault-user-id': user?.id || '',
        },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) {
        setError(data.message || 'Upload failed');
        return;
      }

      setSuccessInfo(
        data.document.scanStatus === 'QUARANTINED'
          ? 'Warning: File was isolated in Quarantine due to detected security risks.'
          : 'Document uploaded successfully, magic-bytes verified, and stored in encrypted vault.'
      );

      setTimeout(() => {
        onUploadSuccess();
        onClose();
      }, 1500);
    } catch (err: any) {
      setError(err.message || 'Network error during upload');
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4 animate-in fade-in">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg overflow-hidden shadow-2xl">
        <div className="p-5 border-b border-slate-800 flex items-center justify-between bg-slate-950">
          <div className="flex items-center space-x-3">
            <div className="w-9 h-9 rounded-lg bg-cyan-950 border border-cyan-800 flex items-center justify-center">
              <UploadCloud className="w-5 h-5 text-cyan-400" />
            </div>
            <div>
              <h3 className="text-base font-semibold text-white">Upload Protected Document</h3>
              <p className="text-xs text-slate-400">Multi-stage magic-byte validation & private storage</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {error && (
            <div className="p-3 rounded-lg bg-rose-950/40 border border-rose-800 text-rose-300 text-xs flex items-center space-x-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {successInfo && (
            <div className="p-3 rounded-lg bg-emerald-950/40 border border-emerald-800 text-emerald-300 text-xs flex items-center space-x-2">
              <CheckCircle className="w-4 h-4 shrink-0" />
              <span>{successInfo}</span>
            </div>
          )}

          {/* Drag & Drop Area */}
          <div
            onDragOver={e => e.preventDefault()}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className="border-2 border-dashed border-slate-700 hover:border-cyan-500/80 rounded-xl p-6 text-center cursor-pointer bg-slate-950/60 hover:bg-slate-950 transition-all group"
          >
            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              className="hidden"
            />
            {file ? (
              <div className="flex items-center justify-center space-x-3">
                <File className="w-8 h-8 text-cyan-400" />
                <div className="text-left">
                  <p className="text-sm font-medium text-white">{file.name}</p>
                  <p className="text-xs text-slate-400">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
              </div>
            ) : (
              <div className="space-y-2">
                <UploadCloud className="w-10 h-10 text-slate-500 group-hover:text-cyan-400 mx-auto transition-colors" />
                <p className="text-xs font-medium text-slate-300">
                  Click to select or drag and drop your document here
                </p>
                <p className="text-[11px] text-slate-500">PDF, TXT, DOCX, CSV, PNG, JPG (Max 25 MB)</p>
              </div>
            )}
          </div>

          {/* Category selection */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Document Category</label>
            <select
              value={category}
              onChange={e => setCategory(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-500"
            >
              <option value="Financial">Financial (Board, Audit, Balances)</option>
              <option value="Legal">Legal (Contracts, NDAs, Compliance)</option>
              <option value="Technical">Technical (Architecture, Infrastructure, Keys)</option>
              <option value="Security">Security (Vulnerability Reports, Audits)</option>
              <option value="General">General Corporate</option>
            </select>
          </div>

          {/* Security Guarantee Box */}
          <div className="bg-slate-950 border border-slate-800/80 rounded-lg p-3 text-xs space-y-1.5">
            <div className="flex items-center space-x-1.5 text-cyan-400 font-medium">
              <Shield className="w-3.5 h-3.5" />
              <span>TrustVault Security Pipeline</span>
            </div>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Files are written to isolated storage outside the web root. File magic bytes are strictly inspected
              to prevent executable masquerading. Upload event is committed to the append-only SHA-256 audit chain.
            </p>
          </div>

          {/* Actions */}
          <div className="pt-2 flex justify-end space-x-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-lg text-xs font-medium text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={uploading || !file}
              className="px-5 py-2 rounded-lg text-xs font-semibold text-white bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 transition-colors flex items-center space-x-2"
            >
              <Lock className="w-3.5 h-3.5" />
              <span>{uploading ? 'Validating & Uploading...' : 'Upload to Secure Vault'}</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
