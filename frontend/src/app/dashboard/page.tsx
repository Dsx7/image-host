"use client";

import { useState, useRef, useEffect } from "react";
import { useAuth } from "@clerk/nextjs";
import { UploadCloud, CheckCircle2, Copy, Trash2, Key, Loader2, ImageIcon, ExternalLink } from "lucide-react";

export default function DashboardPage() {
  const { getToken } = useAuth();
  
  // Upload State
  const [isDragging, setIsDragging] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState<any>(null);
  const [expiresIn, setExpiresIn] = useState<string>("");
  const fileInputRef = useRef<HTMLInputElement>(null);

  // API Key State
  const [hasApiKey, setHasApiKey] = useState(false);
  const [newApiKey, setNewApiKey] = useState<string | null>(null);
  const [isKeyLoading, setIsKeyLoading] = useState(true);

  const apiUrl = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8787";

  // Images State
  const [images, setImages] = useState<any[]>([]);
  const [isImagesLoading, setIsImagesLoading] = useState(true);

  // Fetch API Key status on load
  useEffect(() => {
    async function checkKey() {
      try {
        const token = await getToken();
        const res = await fetch(`${apiUrl}/api/protected/keys`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setHasApiKey(data.hasKey);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsKeyLoading(false);
      }
    }
    async function fetchImages() {
      try {
        const token = await getToken();
        const res = await fetch(`${apiUrl}/api/protected/images`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setImages(data);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setIsImagesLoading(false);
      }
    }
    checkKey();
    fetchImages();
  }, [getToken, apiUrl]);

  // Upload Logic
  const handleUpload = async (file: File) => {
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      alert("File exceeds 2MB limit.");
      return;
    }
    setIsUploading(true);
    setUploadResult(null);
    
    try {
      const token = await getToken();
      const formData = new FormData();
      formData.append("file", file);
      if (expiresIn) {
        formData.append("expires_in_hours", expiresIn);
      }

      const res = await fetch(`${apiUrl}/api/protected/upload`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "Upload failed");
      
      setUploadResult(data.image);
      setImages(prev => [data.image, ...prev]);
    } catch (err: any) {
      alert(err.message);
    } finally {
      setIsUploading(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleUpload(file);
  };

  // API Key Logic
  const generateApiKey = async () => {
    if (!confirm("This will overwrite any existing key. Continue?")) return;
    setIsKeyLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${apiUrl}/api/protected/keys/generate`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (res.ok) {
        setNewApiKey(data.apiKey);
        setHasApiKey(true);
      } else {
        alert(data.error);
      }
    } finally {
      setIsKeyLoading(false);
    }
  };

  const revokeApiKey = async () => {
    if (!confirm("Revoke this key? It will immediately stop working.")) return;
    setIsKeyLoading(true);
    try {
      const token = await getToken();
      const res = await fetch(`${apiUrl}/api/protected/keys/revoke`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        setHasApiKey(false);
        setNewApiKey(null);
      }
    } finally {
      setIsKeyLoading(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    alert("Copied to clipboard!");
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* LEFT COLUMN: Upload Area */}
      <div className="lg:col-span-2 space-y-6">
        <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl">
          <h2 className="text-2xl font-bold mb-4">Upload Image</h2>
          
          <div className="mb-4">
            <label className="block text-sm text-gray-400 mb-2">Auto-Expire (Optional)</label>
            <select 
              value={expiresIn} 
              onChange={(e) => setExpiresIn(e.target.value)}
              className="bg-gray-800 border border-gray-700 text-white rounded-lg px-4 py-2 outline-none focus:border-emerald-500 transition-colors w-full sm:w-auto"
            >
              <option value="">Never expire</option>
              <option value="1">Expire in 1 Hour</option>
              <option value="24">Expire in 24 Hours</option>
            </select>
          </div>

          <div
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-2xl p-12 text-center cursor-pointer transition-all duration-200 flex flex-col items-center justify-center gap-4 ${
              isDragging ? "border-emerald-500 bg-emerald-500/10" : "border-gray-700 hover:border-gray-500 hover:bg-gray-800/50"
            }`}
          >
            <input 
              type="file" 
              ref={fileInputRef} 
              className="hidden" 
              accept="image/*" 
              onChange={(e) => {
                if (e.target.files?.[0]) handleUpload(e.target.files[0]);
              }}
            />
            {isUploading ? (
              <Loader2 className="w-12 h-12 text-emerald-500 animate-spin" />
            ) : (
              <>
                <UploadCloud className={`w-12 h-12 ${isDragging ? "text-emerald-500" : "text-gray-400"}`} />
                <div>
                  <p className="text-lg font-medium text-gray-200">Drag & drop your image here</p>
                  <p className="text-sm text-gray-500 mt-1">or click to browse (Max 2MB)</p>
                </div>
              </>
            )}
          </div>
        </div>

        {/* Post-Upload Share Modal / Section */}
        {uploadResult && (
          <div className="bg-emerald-950/30 border border-emerald-900/50 rounded-2xl p-6 shadow-xl animate-in fade-in slide-in-from-bottom-4">
            <div className="flex items-center gap-3 mb-6">
              <CheckCircle2 className="w-6 h-6 text-emerald-500" />
              <h3 className="text-xl font-bold text-emerald-50">Upload Successful!</h3>
            </div>
            
            <div className="space-y-4">
              {(() => {
                const ext = uploadResult.original_name?.split('.').pop() || 'png';
                const customUrl = `${window.location.origin}/i/${uploadResult.id}.${ext}`;
                return (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-emerald-200/70 uppercase mb-1">Direct URL</label>
                      <div className="flex bg-gray-950 border border-gray-800 rounded-lg overflow-hidden">
                        <input readOnly value={customUrl} className="flex-1 bg-transparent px-4 py-2 text-sm text-gray-300 outline-none" />
                        <button onClick={() => copyToClipboard(customUrl)} className="px-4 bg-gray-800 hover:bg-gray-700 transition-colors border-l border-gray-700 text-gray-300 flex items-center gap-2">
                          <Copy className="w-4 h-4" /> Copy
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-emerald-200/70 uppercase mb-1">Markdown</label>
                      <div className="flex bg-gray-950 border border-gray-800 rounded-lg overflow-hidden">
                        <input readOnly value={`![${uploadResult.original_name}](${customUrl})`} className="flex-1 bg-transparent px-4 py-2 text-sm text-gray-300 outline-none" />
                        <button onClick={() => copyToClipboard(`![${uploadResult.original_name}](${customUrl})`)} className="px-4 bg-gray-800 hover:bg-gray-700 transition-colors border-l border-gray-700 text-gray-300 flex items-center gap-2">
                          <Copy className="w-4 h-4" /> Copy
                        </button>
                      </div>
                    </div>

                    <div>
                      <label className="block text-xs font-semibold text-emerald-200/70 uppercase mb-1">HTML Embed</label>
                      <div className="flex bg-gray-950 border border-gray-800 rounded-lg overflow-hidden">
                        <input readOnly value={`<img src="${customUrl}" alt="${uploadResult.original_name}" />`} className="flex-1 bg-transparent px-4 py-2 text-sm text-gray-300 outline-none" />
                        <button onClick={() => copyToClipboard(`<img src="${customUrl}" alt="${uploadResult.original_name}" />`)} className="px-4 bg-gray-800 hover:bg-gray-700 transition-colors border-l border-gray-700 text-gray-300 flex items-center gap-2">
                          <Copy className="w-4 h-4" /> Copy
                        </button>
                      </div>
                    </div>
                  </>
                );
              })()}
            </div>
          </div>
        )}
      </div>

      {/* RIGHT COLUMN: Developer Profile */}
      <div className="bg-gray-900 border border-gray-800 rounded-2xl p-6 shadow-xl h-fit">
        <div className="flex items-center gap-3 mb-6">
          <Key className="w-5 h-5 text-blue-400" />
          <h2 className="text-xl font-bold">Developer API</h2>
        </div>
        
        <p className="text-sm text-gray-400 mb-6 leading-relaxed">
          Generate an API key to upload and manage images programmatically. Keep it secret!
        </p>

        {isKeyLoading ? (
          <div className="animate-pulse flex space-x-4">
            <div className="h-10 bg-gray-800 rounded w-full"></div>
          </div>
        ) : newApiKey ? (
          <div className="space-y-4 animate-in fade-in">
            <div className="bg-blue-950/30 border border-blue-900/50 rounded-lg p-4">
              <p className="text-xs text-blue-300 mb-2 font-semibold">YOUR NEW API KEY (COPY NOW)</p>
              <div className="flex bg-gray-950 rounded-md overflow-hidden border border-blue-800/50">
                <input readOnly value={newApiKey} className="flex-1 bg-transparent px-3 py-2 text-sm text-blue-100 outline-none font-mono" />
                <button onClick={() => copyToClipboard(newApiKey)} className="px-3 bg-blue-900/50 hover:bg-blue-800/50 transition-colors text-blue-200">
                  <Copy className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-blue-400 mt-2">This will not be shown again.</p>
            </div>
            <button onClick={revokeApiKey} className="w-full flex items-center justify-center gap-2 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-sm font-medium">
              <Trash2 className="w-4 h-4" /> Revoke Key
            </button>
          </div>
        ) : hasApiKey ? (
          <div className="space-y-4">
            <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-4 flex items-center justify-between">
              <span className="text-sm text-emerald-400 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4" /> Key is active
              </span>
            </div>
            <div className="flex gap-2">
              <button onClick={generateApiKey} className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors text-sm font-medium">
                Regenerate
              </button>
              <button onClick={revokeApiKey} className="flex-1 px-4 py-2 bg-red-500/10 hover:bg-red-500/20 text-red-500 rounded-lg transition-colors text-sm font-medium">
                Revoke
              </button>
            </div>
          </div>
        ) : (
          <button onClick={generateApiKey} className="w-full px-4 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-xl transition-all font-semibold shadow-[0_0_15px_rgba(37,99,235,0.3)]">
            Generate API Key
          </button>
        )}
      </div>

      {/* FULL WIDTH COLUMN: User Images */}
      <div className="lg:col-span-3 mt-8 border-t border-gray-800 pt-8">
        <h2 className="text-2xl font-bold mb-6 flex items-center gap-2">
          <ImageIcon className="w-6 h-6 text-emerald-500" /> My Uploaded Images
        </h2>
        
        {isImagesLoading ? (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {[...Array(6)].map((_, i) => (
              <div key={i} className="aspect-square bg-gray-800 animate-pulse rounded-xl"></div>
            ))}
          </div>
        ) : images.length === 0 ? (
          <div className="text-center py-12 bg-gray-900 border border-gray-800 rounded-2xl">
            <ImageIcon className="w-12 h-12 text-gray-600 mx-auto mb-3" />
            <p className="text-gray-400">You haven't uploaded any images yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-4">
            {images.map(img => (
              <div key={img.id} className="group relative aspect-square bg-gray-900 border border-gray-800 rounded-xl overflow-hidden hover:border-emerald-500 transition-all duration-300 shadow-lg hover:shadow-emerald-500/20">
                <img src={img.cloudinary_url || img.url} alt={img.original_name} className="w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-end p-4">
                  <p className="text-xs text-white truncate mb-2 font-medium">{img.original_name}</p>
                  <div className="flex items-center gap-2">
                    <button onClick={() => copyToClipboard(img.url)} className="flex-1 p-2 bg-gray-800 hover:bg-gray-700 rounded-lg text-white flex justify-center transition-colors">
                      <Copy className="w-4 h-4" />
                    </button>
                    <a href={img.url} target="_blank" className="flex-1 p-2 bg-emerald-600 hover:bg-emerald-500 rounded-lg text-white flex justify-center transition-colors">
                      <ExternalLink className="w-4 h-4" />
                    </a>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
