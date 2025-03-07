import React, { useState, useCallback } from 'react';
import { Upload, FileUp, Loader2 } from 'lucide-react';
import { toast } from 'react-hot-toast';
import DataTable from '../components/DataTable';
import { useAuth } from '../context/AuthContext';
import axios from 'axios';

export default function Dashboard() {
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const { token } = useAuth();
  // Use refreshData toggle to force re-render of DataTable after upload
  const [refreshData, setRefreshData] = useState(false);

  const handleFileUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    // Validate file extension
    if (!file.name.endsWith('.csv')) {
      toast.error('Please upload a CSV file');
      return;
    }

    setIsUploading(true);
    setUploadProgress(0);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await axios.post('http://localhost:5000/csv/upload', formData, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        },
        onUploadProgress: (progressEvent) => {
          const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          setUploadProgress(percent);
        }
      });

      toast.success('File uploaded successfully');
      // Toggle refreshData to force DataTable re-render (or use a dedicated refresh mechanism)
      setRefreshData(prev => !prev);
    } catch (error) {
      console.error('Upload error:', error);
      toast.error('Failed to upload file');
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  }, [token]);

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm">
        <h1 className="text-2xl font-bold text-gray-900">Dashboard</h1>
        <p className="mt-2 text-gray-600">Upload and manage your CSV files</p>
      </div>

      {/* Upload Section */}
      <div className="bg-white p-8 rounded-lg shadow-sm">
        <div className="max-w-xl mx-auto text-center">
          <Upload className="mx-auto h-12 w-12 text-gray-400" />
          <h2 className="mt-4 text-xl font-semibold text-gray-900">
            Upload your CSV file
          </h2>
          <p className="mt-2 text-gray-500">
            Drag and drop your CSV file here, or click to select a file
          </p>

          <div className="mt-8">
            <label className="relative">
              <input
                type="file"
                className="hidden"
                accept=".csv"
                onChange={handleFileUpload}
                disabled={isUploading}
              />
              <div className={`
                flex items-center justify-center px-6 py-4 border-2 border-dashed
                rounded-lg cursor-pointer hover:border-indigo-500 transition-colors
                ${isUploading ? 'bg-gray-50 border-gray-300' : 'border-gray-300 hover:bg-gray-50'}
              `}>
                {isUploading ? (
                  <div className="flex items-center space-x-3">
                    <Loader2 className="h-5 w-5 animate-spin text-indigo-500" />
                    <span className="text-gray-600">Uploading... {uploadProgress}%</span>
                  </div>
                ) : (
                  <div className="flex items-center space-x-3">
                    <FileUp className="h-5 w-5 text-gray-400" />
                    <span className="text-gray-600">Select CSV file</span>
                  </div>
                )}
              </div>
            </label>
          </div>

          <div className="mt-4 text-sm text-gray-500">
            Maximum file size: 1GB
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm">
        <DataTable key={refreshData ? 'refresh' : 'data'} />
      </div>
    </div>
  );
}
