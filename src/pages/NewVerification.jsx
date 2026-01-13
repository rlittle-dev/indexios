import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ArrowLeft, Phone, Mail, Building, User, Calendar, Briefcase, CheckCircle2 } from 'lucide-react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';

export default function NewVerification() {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [verificationId, setVerificationId] = useState(null);
  const [formData, setFormData] = useState({
    candidateName: '',
    candidateEmail: '',
    companyName: '',
    companyPhone: '',
    employerEmail: '',
    jobTitle: '',
    employmentDates: ''
  });

  useEffect(() => {
    const fetchUser = async () => {
      try {
        const currentUser = await base44.auth.me();
        setUser(currentUser);
      } catch (error) {
        base44.auth.redirectToLogin(createPageUrl('NewVerification'));
      }
    };
    fetchUser();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const response = await base44.functions.invoke('createVerification', formData);
      setVerificationId(response.data.verificationId);
      setSuccess(true);
    } catch (error) {
      console.error('Create verification error:', error);
      alert('Failed to create verification. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!user) {
    return <div className="min-h-screen bg-zinc-950 flex items-center justify-center">
      <div className="w-8 h-8 border-2 border-purple-400 border-t-transparent rounded-full animate-spin" />
    </div>;
  }

  if (success) {
    return (
      <div className="min-h-screen bg-zinc-950 flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8 max-w-md w-full text-center"
        >
          <div className="w-16 h-16 bg-green-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 className="w-8 h-8 text-green-400" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Verification Created!</h2>
          <p className="text-white/60 mb-6">
            Consent request has been sent to the candidate's email. They have 7 days to approve.
          </p>
          <div className="space-y-3">
            <Link to={createPageUrl('VerificationDetail') + `?id=${verificationId}`}>
              <Button className="w-full bg-white hover:bg-gray-100 text-black">
                View Verification
              </Button>
            </Link>
            <Link to={createPageUrl('VerificationsList')}>
              <Button variant="outline" className="w-full border-white/20 text-white hover:bg-white/10">
                Back to List
              </Button>
            </Link>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-zinc-950 py-12 px-4">
      <div className="max-w-2xl mx-auto">
        <Link to={createPageUrl('VerificationsList')}>
          <Button variant="ghost" className="mb-6 text-white hover:text-white hover:bg-white/10">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Verifications
          </Button>
        </Link>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-zinc-900 border border-zinc-800 rounded-2xl p-8"
        >
          <h1 className="text-3xl font-bold text-white mb-2">New Employment Verification</h1>
          <p className="text-white/60 mb-8">
            Start a new employment verification. The candidate will receive a consent request via email.
          </p>

          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Candidate Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <User className="w-5 h-5" />
                Candidate Information
              </h3>
              <div>
                <Label htmlFor="candidateName" className="text-white mb-2 block">
                  Candidate Name *
                </Label>
                <Input
                  id="candidateName"
                  value={formData.candidateName}
                  onChange={(e) => setFormData({ ...formData, candidateName: e.target.value })}
                  required
                  className="bg-zinc-800 border-zinc-700 text-white"
                  placeholder="John Doe"
                />
              </div>
              <div>
                <Label htmlFor="candidateEmail" className="text-white mb-2 block">
                  Candidate Email *
                </Label>
                <Input
                  id="candidateEmail"
                  type="email"
                  value={formData.candidateEmail}
                  onChange={(e) => setFormData({ ...formData, candidateEmail: e.target.value })}
                  required
                  className="bg-zinc-800 border-zinc-700 text-white"
                  placeholder="john@example.com"
                />
              </div>
            </div>

            {/* Company Information */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Building className="w-5 h-5" />
                Company Information
              </h3>
              <div>
                <Label htmlFor="companyName" className="text-white mb-2 block">
                  Company Name *
                </Label>
                <Input
                  id="companyName"
                  value={formData.companyName}
                  onChange={(e) => setFormData({ ...formData, companyName: e.target.value })}
                  required
                  className="bg-zinc-800 border-zinc-700 text-white"
                  placeholder="Acme Corp"
                />
              </div>
              <div>
                <Label htmlFor="companyPhone" className="text-white mb-2 block">
                  Company Phone Number *
                </Label>
                <div className="flex items-center gap-2">
                  <Phone className="w-4 h-4 text-white/60" />
                  <Input
                    id="companyPhone"
                    type="tel"
                    value={formData.companyPhone}
                    onChange={(e) => setFormData({ ...formData, companyPhone: e.target.value })}
                    required
                    className="bg-zinc-800 border-zinc-700 text-white"
                    placeholder="+1234567890"
                  />
                </div>
                <p className="text-white/40 text-xs mt-1">
                  This number will be called for verification
                </p>
              </div>
              <div>
                <Label htmlFor="employerEmail" className="text-white mb-2 block">
                  Employer Email (Optional)
                </Label>
                <div className="flex items-center gap-2">
                  <Mail className="w-4 h-4 text-white/60" />
                  <Input
                    id="employerEmail"
                    type="email"
                    value={formData.employerEmail}
                    onChange={(e) => setFormData({ ...formData, employerEmail: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-white"
                    placeholder="hr@acmecorp.com"
                  />
                </div>
                <p className="text-white/40 text-xs mt-1">
                  Fallback email if phone verification fails
                </p>
              </div>
            </div>

            {/* Employment Details */}
            <div className="space-y-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5" />
                Employment Details (Optional)
              </h3>
              <div>
                <Label htmlFor="jobTitle" className="text-white mb-2 block">
                  Job Title
                </Label>
                <Input
                  id="jobTitle"
                  value={formData.jobTitle}
                  onChange={(e) => setFormData({ ...formData, jobTitle: e.target.value })}
                  className="bg-zinc-800 border-zinc-700 text-white"
                  placeholder="Software Engineer"
                />
              </div>
              <div>
                <Label htmlFor="employmentDates" className="text-white mb-2 block">
                  Employment Dates
                </Label>
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-white/60" />
                  <Input
                    id="employmentDates"
                    value={formData.employmentDates}
                    onChange={(e) => setFormData({ ...formData, employmentDates: e.target.value })}
                    className="bg-zinc-800 border-zinc-700 text-white"
                    placeholder="Jan 2020 - Present"
                  />
                </div>
              </div>
            </div>

            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-white hover:bg-gray-100 text-black font-medium"
            >
              {loading ? 'Creating...' : 'Create Verification'}
            </Button>
          </form>
        </motion.div>
      </div>
    </div>
  );
}