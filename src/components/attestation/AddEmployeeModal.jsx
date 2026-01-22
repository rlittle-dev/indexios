import React, { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Upload, User, FileText, Loader2, CheckCircle, Building2, MapPin, Phone, Mail, Briefcase, Calendar } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { base44 } from '@/api/base44Client';

const US_STATES = [
  'Alabama', 'Alaska', 'Arizona', 'Arkansas', 'California', 'Colorado', 'Connecticut', 'Delaware',
  'Florida', 'Georgia', 'Hawaii', 'Idaho', 'Illinois', 'Indiana', 'Iowa', 'Kansas', 'Kentucky',
  'Louisiana', 'Maine', 'Maryland', 'Massachusetts', 'Michigan', 'Minnesota', 'Mississippi',
  'Missouri', 'Montana', 'Nebraska', 'Nevada', 'New Hampshire', 'New Jersey', 'New Mexico',
  'New York', 'North Carolina', 'North Dakota', 'Ohio', 'Oklahoma', 'Oregon', 'Pennsylvania',
  'Rhode Island', 'South Carolina', 'South Dakota', 'Tennessee', 'Texas', 'Utah', 'Vermont',
  'Virginia', 'Washington', 'West Virginia', 'Wisconsin', 'Wyoming'
];

export default function AddEmployeeModal({ isOpen, onClose, verifiedWorkplace, onSuccess }) {
  const [mode, setMode] = useState(null); // 'manual' or 'resume'
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState(null);
  
  // Manual form state
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    state: '',
    city: '',
    email: '',
    phone: '',
    linkedinUrl: '',
    jobTitle: '',
    startDate: '',
    endDate: '',
    notes: ''
  });

  // Resume upload state
  const [resumeFile, setResumeFile] = useState(null);
  const [extractedData, setExtractedData] = useState(null);

  const resetForm = () => {
    setMode(null);
    setLoading(false);
    setSuccess(false);
    setError(null);
    setFormData({
      firstName: '',
      lastName: '',
      state: '',
      city: '',
      email: '',
      phone: '',
      linkedinUrl: '',
      jobTitle: '',
      startDate: '',
      endDate: '',
      notes: ''
    });
    setResumeFile(null);
    setExtractedData(null);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleResumeUpload = async (file) => {
    setResumeFile(file);
    setLoading(true);
    setError(null);

    try {
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      const result = await base44.integrations.Core.ExtractDataFromUploadedFile({
        file_url,
        json_schema: {
          type: "object",
          properties: {
            first_name: { type: "string" },
            last_name: { type: "string" },
            email: { type: "string" },
            phone: { type: "string" },
            linkedin_url: { type: "string" },
            city: { type: "string" },
            state: { type: "string" },
            companies: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  name: { type: "string" },
                  job_title: { type: "string" },
                  start_date: { type: "string" },
                  end_date: { type: "string" }
                }
              }
            }
          }
        }
      });

      if (result.status === 'success' && result.output) {
        setExtractedData(result.output);
        // Pre-fill form with extracted data
        setFormData(prev => ({
          ...prev,
          firstName: result.output.first_name || '',
          lastName: result.output.last_name || '',
          email: result.output.email || '',
          phone: result.output.phone || '',
          linkedinUrl: result.output.linkedin_url || '',
          city: result.output.city || '',
          state: result.output.state || '',
          jobTitle: result.output.companies?.[0]?.job_title || '',
          startDate: result.output.companies?.[0]?.start_date || '',
          endDate: result.output.companies?.[0]?.end_date || ''
        }));
      }
    } catch (err) {
      console.error('Resume extraction error:', err);
      setError('Failed to extract data from resume. Please enter details manually.');
    }
    
    setLoading(false);
  };

  const handleSubmit = async () => {
    if (!formData.firstName || !formData.lastName || !formData.state) {
      setError('First Name, Last Name, and State are required.');
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const response = await base44.functions.invoke('manualEmployerAttestation', {
        candidateData: {
          firstName: formData.firstName,
          lastName: formData.lastName,
          state: formData.state,
          city: formData.city,
          email: formData.email,
          phone: formData.phone,
          linkedinUrl: formData.linkedinUrl
        },
        employmentData: {
          jobTitle: formData.jobTitle,
          startDate: formData.startDate,
          endDate: formData.endDate,
          notes: formData.notes
        },
        companyName: verifiedWorkplace.company,
        companyDomain: verifiedWorkplace.domain
      });

      if (response.data?.success) {
        setSuccess(true);
        setTimeout(() => {
          onSuccess?.();
          handleClose();
        }, 2000);
      } else {
        setError(response.data?.error || 'Failed to create attestation');
      }
    } catch (err) {
      console.error('Attestation error:', err);
      setError(err.message || 'Failed to create attestation');
    }

    setLoading(false);
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/70 z-50 flex items-center justify-center p-4"
        onClick={handleClose}
      >
        <motion.div
          initial={{ scale: 0.95, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.95, opacity: 0 }}
          onClick={(e) => e.stopPropagation()}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-lg bg-green-500/20">
                <User className="w-5 h-5 text-green-400" />
              </div>
              <h2 className="text-xl font-semibold text-white">Add Employee</h2>
            </div>
            <button onClick={handleClose} className="p-2 hover:bg-zinc-800 rounded-lg transition-colors">
              <X className="w-5 h-5 text-white/60" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6">
            {success ? (
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="text-center py-8"
              >
                <div className="inline-flex p-4 rounded-full bg-green-500/20 mb-4">
                  <CheckCircle className="w-8 h-8 text-green-400" />
                </div>
                <h3 className="text-xl font-semibold text-white mb-2">Employee Attested!</h3>
                <p className="text-white/60">
                  On-chain attestation created successfully.
                </p>
              </motion.div>
            ) : !mode ? (
              // Mode selection
              <div className="space-y-4">
                <p className="text-white/70 text-sm mb-6">
                  Choose how you'd like to add employee information:
                </p>
                
                <button
                  onClick={() => setMode('resume')}
                  className="w-full flex items-center gap-4 p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl hover:border-blue-500/50 hover:bg-blue-500/10 transition-all"
                >
                  <div className="p-3 rounded-lg bg-blue-500/20">
                    <FileText className="w-6 h-6 text-blue-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium">Upload Resume</p>
                    <p className="text-white/60 text-sm">Extract employee data from their resume</p>
                  </div>
                </button>

                <button
                  onClick={() => setMode('manual')}
                  className="w-full flex items-center gap-4 p-4 bg-zinc-800/50 border border-zinc-700 rounded-xl hover:border-green-500/50 hover:bg-green-500/10 transition-all"
                >
                  <div className="p-3 rounded-lg bg-green-500/20">
                    <User className="w-6 h-6 text-green-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium">Manual Entry</p>
                    <p className="text-white/60 text-sm">Enter employee details manually</p>
                  </div>
                </button>
              </div>
            ) : (
              // Form view
              <div className="space-y-6">
                {/* Back button */}
                <button
                  onClick={() => {
                    setMode(null);
                    setExtractedData(null);
                    setResumeFile(null);
                  }}
                  className="text-white/60 hover:text-white text-sm flex items-center gap-1"
                >
                  ← Back to options
                </button>

                {/* Resume upload zone */}
                {mode === 'resume' && !extractedData && (
                  <div
                    className="border-2 border-dashed border-zinc-700 rounded-xl p-8 text-center hover:border-blue-500/50 transition-colors cursor-pointer"
                    onClick={() => document.getElementById('resume-input').click()}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={(e) => {
                      e.preventDefault();
                      const file = e.dataTransfer.files[0];
                      if (file?.type === 'application/pdf') handleResumeUpload(file);
                    }}
                  >
                    <input
                      id="resume-input"
                      type="file"
                      accept=".pdf"
                      className="hidden"
                      onChange={(e) => {
                        const file = e.target.files?.[0];
                        if (file) handleResumeUpload(file);
                      }}
                    />
                    {loading ? (
                      <div className="flex flex-col items-center gap-3">
                        <Loader2 className="w-8 h-8 text-blue-400 animate-spin" />
                        <p className="text-white/70">Extracting data from resume...</p>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-10 h-10 text-white/40 mx-auto mb-3" />
                        <p className="text-white font-medium mb-1">Drop resume here or click to upload</p>
                        <p className="text-white/50 text-sm">PDF files only</p>
                      </>
                    )}
                  </div>
                )}

                {/* Manual form or extracted data form */}
                {(mode === 'manual' || extractedData) && (
                  <div className="space-y-4">
                    {extractedData && (
                      <div className="bg-blue-500/10 border border-blue-500/30 rounded-lg p-3 mb-4">
                        <p className="text-blue-300 text-sm">
                          <CheckCircle className="w-4 h-4 inline mr-1" />
                          Data extracted from resume. Please verify and complete.
                        </p>
                      </div>
                    )}

                    {/* Required Fields */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label className="text-white/70 text-sm mb-1.5 flex items-center gap-1">
                          First Name <span className="text-red-400">*</span>
                        </Label>
                        <Input
                          value={formData.firstName}
                          onChange={(e) => setFormData(prev => ({ ...prev, firstName: e.target.value }))}
                          className="bg-zinc-800 border-zinc-700 text-white"
                          placeholder="John"
                        />
                      </div>
                      <div>
                        <Label className="text-white/70 text-sm mb-1.5 flex items-center gap-1">
                          Last Name <span className="text-red-400">*</span>
                        </Label>
                        <Input
                          value={formData.lastName}
                          onChange={(e) => setFormData(prev => ({ ...prev, lastName: e.target.value }))}
                          className="bg-zinc-800 border-zinc-700 text-white"
                          placeholder="Doe"
                        />
                      </div>
                    </div>

                    <div>
                      <Label className="text-white/70 text-sm mb-1.5 flex items-center gap-1">
                        <MapPin className="w-3 h-3" /> State <span className="text-red-400">*</span>
                      </Label>
                      <select
                        value={formData.state}
                        onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                        className="w-full h-10 px-3 bg-zinc-800 border border-zinc-700 rounded-md text-white"
                      >
                        <option value="">Select state...</option>
                        {US_STATES.map(state => (
                          <option key={state} value={state}>{state}</option>
                        ))}
                      </select>
                    </div>

                    {/* Optional Fields */}
                    <div className="border-t border-zinc-800 pt-4 mt-4">
                      <p className="text-white/50 text-xs mb-4">Optional - helps with matching</p>
                      
                      <div className="space-y-4">
                        <div>
                          <Label className="text-white/70 text-sm mb-1.5 flex items-center gap-1">
                            <MapPin className="w-3 h-3" /> City
                          </Label>
                          <Input
                            value={formData.city}
                            onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                            className="bg-zinc-800 border-zinc-700 text-white"
                            placeholder="New York"
                          />
                        </div>

                        <div>
                          <Label className="text-white/70 text-sm mb-1.5 flex items-center gap-1">
                            <Mail className="w-3 h-3" /> Email
                          </Label>
                          <Input
                            type="email"
                            value={formData.email}
                            onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                            className="bg-zinc-800 border-zinc-700 text-white"
                            placeholder="john.doe@email.com"
                          />
                        </div>

                        <div>
                          <Label className="text-white/70 text-sm mb-1.5 flex items-center gap-1">
                            <Phone className="w-3 h-3" /> Phone
                          </Label>
                          <Input
                            value={formData.phone}
                            onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                            className="bg-zinc-800 border-zinc-700 text-white"
                            placeholder="(555) 123-4567"
                          />
                        </div>

                        <div>
                          <Label className="text-white/70 text-sm mb-1.5">LinkedIn URL</Label>
                          <Input
                            value={formData.linkedinUrl}
                            onChange={(e) => setFormData(prev => ({ ...prev, linkedinUrl: e.target.value }))}
                            className="bg-zinc-800 border-zinc-700 text-white"
                            placeholder="https://linkedin.com/in/johndoe"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Employment Details */}
                    <div className="border-t border-zinc-800 pt-4 mt-4">
                      <p className="text-white/70 text-sm font-medium mb-4 flex items-center gap-2">
                        <Briefcase className="w-4 h-4" /> Employment at {verifiedWorkplace?.company}
                      </p>
                      
                      <div className="space-y-4">
                        <div>
                          <Label className="text-white/70 text-sm mb-1.5">Job Title</Label>
                          <Input
                            value={formData.jobTitle}
                            onChange={(e) => setFormData(prev => ({ ...prev, jobTitle: e.target.value }))}
                            className="bg-zinc-800 border-zinc-700 text-white"
                            placeholder="Software Engineer"
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <Label className="text-white/70 text-sm mb-1.5 flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> Start Date
                            </Label>
                            <Input
                              type="date"
                              value={formData.startDate}
                              onChange={(e) => setFormData(prev => ({ ...prev, startDate: e.target.value }))}
                              className="bg-zinc-800 border-zinc-700 text-white"
                            />
                          </div>
                          <div>
                            <Label className="text-white/70 text-sm mb-1.5 flex items-center gap-1">
                              <Calendar className="w-3 h-3" /> End Date
                            </Label>
                            <Input
                              type="date"
                              value={formData.endDate}
                              onChange={(e) => setFormData(prev => ({ ...prev, endDate: e.target.value }))}
                              className="bg-zinc-800 border-zinc-700 text-white"
                              placeholder="Leave blank if current"
                            />
                          </div>
                        </div>

                        <div>
                          <Label className="text-white/70 text-sm mb-1.5">Notes</Label>
                          <Textarea
                            value={formData.notes}
                            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
                            className="bg-zinc-800 border-zinc-700 text-white resize-none"
                            placeholder="Any additional notes..."
                            rows={2}
                          />
                        </div>
                      </div>
                    </div>

                    {error && (
                      <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3">
                        <p className="text-red-300 text-sm">{error}</p>
                      </div>
                    )}

                    <Button
                      onClick={handleSubmit}
                      disabled={loading || !formData.firstName || !formData.lastName || !formData.state}
                      className="w-full bg-green-600 hover:bg-green-500 text-white"
                    >
                      {loading ? (
                        <>
                          <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                          Creating Attestation...
                        </>
                      ) : (
                        <>
                          <CheckCircle className="w-4 h-4 mr-2" />
                          Attest Employment
                        </>
                      )}
                    </Button>
                  </div>
                )}
              </div>
            )}
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}