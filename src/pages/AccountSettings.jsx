import React, { useEffect, useState } from 'react';
import { ErrorBanner, LoadingBlock } from '../components/StateBlocks';
import { useAuctions } from '../context/AuctionContext';

const emptyKycForm = {
  documentType: 'cnic',
  consentAccepted: false,
  consentTextVersion: 'kyc-consent-v1',
};

const emptyPaymentMethod = {
  provider: 'bank_transfer',
  label: '',
  maskedReference: '',
  accountTitle: '',
  accountNumber: '',
  iban: '',
  branchName: '',
  phoneNumber: '',
};

const fallbackPaymentProviders = [
  { id: 'bank_transfer', label: 'Bank transfer / IBFT' },
  { id: 'easypaisa', label: 'Easypaisa' },
  { id: 'jazzcash', label: 'JazzCash' },
  { id: 'card_gateway', label: 'Card gateway' },
  { id: 'manual_confirmation', label: 'Manual confirmation' },
];

const AccountSettings = () => {
  const { api, authUser, userProfile, backendStatus, logout } = useAuctions();
  const [activeTab, setActiveTab] = useState('Profile');
  const [saveMessage, setSaveMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [verification, setVerification] = useState(null);
  const [kycProfile, setKycProfile] = useState(null);
  const [paymentProviders, setPaymentProviders] = useState([]);
  const [paymentMethods, setPaymentMethods] = useState([]);
  const [paymentTransactions, setPaymentTransactions] = useState([]);
  const [sessions, setSessions] = useState([]);
  const [providers, setProviders] = useState([]);
  const [linkedProviders, setLinkedProviders] = useState([]);
  const [platformContracts, setPlatformContracts] = useState(null);
  const [otpChallenge, setOtpChallenge] = useState(null);
  const [otpPhone, setOtpPhone] = useState(authUser?.phone || '');
  const [otpCode, setOtpCode] = useState('');
  const [otpTimeLeft, setOtpTimeLeft] = useState(0);
  const [otpResendCooldown, setOtpResendCooldown] = useState(0);
  const [paymentForm, setPaymentForm] = useState(emptyPaymentMethod);
  const [kycForm, setKycForm] = useState(emptyKycForm);
  const [kycFile, setKycFile] = useState('');
  const [isOtpSubmitting, setIsOtpSubmitting] = useState(false);
  const [isKycUploading, setIsKycUploading] = useState(false);
  const [isPaymentSaving, setIsPaymentSaving] = useState(false);
  const tabs = ['Profile', 'Security', 'Privacy', 'KYC', 'Payments', 'Notifications'];

  useEffect(() => {
    let cancelled = false;

    const loadTrustData = async () => {
      if (!backendStatus.available || !authUser) {
        setLoading(false);
        return;
      }

      setLoading(true);
      const [verificationResult, kycResult, paymentProvidersResult, methodsResult, transactionsResult, sessionsResult, providersResult, contractsResult] = await Promise.allSettled([
        api.verification.me(),
        api.trust.getKycProfile(),
        api.payments.providers ? api.payments.providers() : Promise.resolve({ methods: [] }),
        api.payments.methods(),
        api.payments.transactions(),
        api.auth.sessions ? api.auth.sessions() : Promise.resolve({ sessions: [] }),
        api.auth.providers ? api.auth.providers() : Promise.resolve({ providers: [] }),
        api.platform?.contracts ? api.platform.contracts() : Promise.resolve(null),
      ]);

      if (cancelled) return;

      setVerification(verificationResult.status === 'fulfilled' ? verificationResult.value : null);
      setKycProfile(kycResult.status === 'fulfilled' ? kycResult.value?.kycProfile || null : null);
      setPaymentProviders(paymentProvidersResult.status === 'fulfilled' ? paymentProvidersResult.value?.methods || [] : []);
      setPaymentMethods(methodsResult.status === 'fulfilled' ? methodsResult.value?.methods || [] : []);
      setPaymentTransactions(transactionsResult.status === 'fulfilled' ? transactionsResult.value?.transactions || [] : []);
      setSessions(sessionsResult.status === 'fulfilled' ? sessionsResult.value?.sessions || [] : []);
      const providerItems = providersResult.status === 'fulfilled' ? providersResult.value?.providers || [] : [];
      setProviders(providerItems);
      setLinkedProviders(providerItems.filter((provider) => provider.linked).map((provider) => provider.link));
      setPlatformContracts(contractsResult.status === 'fulfilled' ? contractsResult.value : null);
      setLoading(false);
    };

    loadTrustData();
    return () => {
      cancelled = true;
    };
  }, [api, authUser, backendStatus.available]);

  useEffect(() => {
    if (!otpChallenge?.expiresAt || otpChallenge.expiresAt === 'Demo session') {
      setOtpTimeLeft(otpChallenge?.expiresAt === 'Demo session' ? 600 : 0);
      return undefined;
    }

    const updateTimer = () => {
      const next = Math.max(0, Math.floor((new Date(otpChallenge.expiresAt).getTime() - Date.now()) / 1000));
      setOtpTimeLeft(next);
    };

    updateTimer();
    const timer = window.setInterval(updateTimer, 1000);
    return () => window.clearInterval(timer);
  }, [otpChallenge]);

  useEffect(() => {
    if (!otpResendCooldown) return undefined;
    const timer = window.setInterval(() => {
      setOtpResendCooldown((current) => Math.max(0, current - 1));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [otpResendCooldown]);

  const saveSettings = () => setSaveMessage(`${activeTab} settings saved for this frontend session.`);

  const signOut = () => {
    const result = logout();
    setSaveMessage(result.message);
  };

  const startOtpVerification = async () => {
    if (!otpPhone.trim()) {
      setSaveMessage('Enter a phone number first.');
      return;
    }

    if (!backendStatus.available || !authUser) {
      setOtpChallenge({ id: 'demo-otp', devCode: '123456', expiresAt: 'Demo session' });
      setOtpResendCooldown(30);
      setSaveMessage('Demo OTP started. Use 123456 in preview mode.');
      return;
    }

    setIsOtpSubmitting(true);
    try {
      const result = await api.auth.startOtp({ phone: otpPhone.trim(), channel: 'sms' });
      setOtpChallenge({ id: result.challengeId, devCode: result.devCode, expiresAt: result.expiresAt });
      setOtpResendCooldown(30);
      setSaveMessage(result.devCode ? `OTP started. Dev code: ${result.devCode}` : 'OTP sent to your phone.');
    } catch (error) {
      setSaveMessage(error.message || 'Unable to start OTP verification.');
    } finally {
      setIsOtpSubmitting(false);
    }
  };

  const verifyOtpCode = async () => {
    if (!otpChallenge?.id || !otpCode.trim()) {
      setSaveMessage('Start OTP first and enter the code.');
      return;
    }

    if (!backendStatus.available || !authUser) {
      setSaveMessage(otpCode === '123456' ? 'Demo phone verification complete.' : 'Use 123456 in demo mode.');
      return;
    }

    setIsOtpSubmitting(true);
    try {
      const result = await api.auth.verifyOtp({ challengeId: otpChallenge.id, code: otpCode.trim() });
      const verificationResult = await api.verification.me().catch(() => null);
      setVerification(verificationResult);
      setSaveMessage(result.message || 'Phone verified.');
      setOtpCode('');
      setOtpChallenge(null);
      setOtpTimeLeft(0);
    } catch (error) {
      setSaveMessage(error.message || 'OTP verification failed.');
    } finally {
      setIsOtpSubmitting(false);
    }
  };

  const uploadKyc = async (file) => {
    if (!file) return;
    setKycFile(file.name);

    if (!kycForm.consentAccepted) {
      setSaveMessage('Accept KYC consent before uploading.');
      return;
    }

    if (!backendStatus.available || !authUser) {
      setSaveMessage(`Demo KYC staged: ${file.name}. Backend login is required to submit the real review package.`);
      return;
    }

    setIsKycUploading(true);
    try {
      const intent = await api.media.createDocumentUploadIntent({
        fileName: file.name,
        mimeType: file.type,
        sizeBytes: file.size,
        purpose: 'kyc_document',
      });
      if (!intent.uploadUrl) throw new Error(intent.message || 'Document provider did not return an upload URL.');

      const uploadUrl = new URL(intent.uploadUrl, process.env.REACT_APP_API_URL?.replace(/\/api$/, '') || 'http://localhost:4000');
      await fetch(uploadUrl.toString(), { method: intent.method || 'PUT', body: file });
      const completed = await api.media.completeUpload({ mediaAssetId: intent.asset.id });
      const result = await api.auth.getMe().catch(() => null);
      const submission = await apiHttpSubmitKyc(api, {
        provider: 'manual_review',
        consentAccepted: true,
        consentTextVersion: kycForm.consentTextVersion,
        documents: [
          {
            documentType: kycForm.documentType,
            mediaAssetId: completed.asset.id,
          },
        ],
      });
      setKycProfile(submission?.kycProfile || null);
      setVerification(await api.verification.me().catch(() => verification));
      setSaveMessage(result?.user ? 'KYC document uploaded and submitted for admin review.' : 'KYC document submitted for admin review.');
    } catch (error) {
      setSaveMessage(error.message || 'KYC upload failed.');
    } finally {
      setIsKycUploading(false);
    }
  };

  const savePaymentMethod = async () => {
    if (!paymentForm.label.trim()) {
      setSaveMessage('Add a payment label so admins and sellers know what this method is.');
      return;
    }

    const paymentPayload = buildPaymentMethodPayload(paymentForm);

    if (!backendStatus.available || !authUser) {
      setPaymentMethods((current) => [
        {
          id: `demo-method-${Date.now()}`,
          provider: paymentPayload.provider,
          label: paymentPayload.label,
          maskedReference: paymentPayload.maskedReference,
          metadata: paymentPayload.metadata,
          status: 'sandbox_ready',
          providerMode: 'sandbox',
        },
        ...current,
      ]);
      setPaymentForm(emptyPaymentMethod);
      setSaveMessage('Demo payment method saved locally.');
      return;
    }

    setIsPaymentSaving(true);
    try {
      const result = await api.payments.createMethod(paymentPayload);
      setPaymentMethods((current) => [result.method, ...current]);
      setPaymentForm(emptyPaymentMethod);
      setSaveMessage('Payment method added for review.');
    } catch (error) {
      setSaveMessage(error.message || 'Unable to save payment method.');
    } finally {
      setIsPaymentSaving(false);
    }
  };

  const linkProvider = async (providerKey) => {
    if (!api.auth?.linkProvider || !providerKey) return;
    try {
      const result = await api.auth.linkProvider(providerKey, {
        providerSubject: `${providerKey}:${authUser?.id || 'preview'}`,
        email: authUser?.email || null,
        displayName: userProfile?.name || authUser?.fullName || authUser?.email || 'Wheels and Deals user',
      });
      setLinkedProviders((current) => [
        result.provider,
        ...current.filter((item) => item.provider !== result.provider?.provider),
      ]);
      setSaveMessage(`${providerKey} linked to this account using the adapter-first flow.`);
    } catch (error) {
      setSaveMessage(error.message || `Unable to link ${providerKey} right now.`);
    }
  };

  const revokeSession = async (sessionId) => {
    if (!api.auth?.revokeSession || !sessionId) return;
    try {
      await api.auth.revokeSession(sessionId);
      setSessions((current) => current.filter((session) => session.id !== sessionId));
      setSaveMessage('Session revoked.');
    } catch (error) {
      setSaveMessage(error.message || 'Unable to revoke that session.');
    }
  };

  if (loading) {
    return (
      <main className="bg-slate-50 min-h-screen py-10">
        <section className="max-w-5xl mx-auto px-4">
          <LoadingBlock title="Loading trust controls" text="Fetching verification, KYC, and payment setup from the backend." />
        </section>
      </main>
    );
  }

  return (
    <main className="bg-slate-50 min-h-screen py-10">
      <section className="max-w-5xl mx-auto px-4">
        <div className="mb-8">
          <p className="text-blue-600 font-black text-xs uppercase tracking-[0.3em]">Account settings</p>
          <h1 className="text-4xl font-black text-slate-900 mt-2">Profile, security, KYC, payments, and notifications.</h1>
          <p className="text-slate-500 mt-2">{backendStatus.message}</p>
        </div>

        {!backendStatus.available && (
          <div className="mb-5">
            <ErrorBanner title="Frontend demo mode" text="Backend auth, OTP, payment, and KYC review controls are staged locally until the API session is connected." />
          </div>
        )}

        <div className="flex flex-wrap gap-2 mb-5">
          {tabs.map((tab) => (
            <button key={tab} onClick={() => setActiveTab(tab)} className={`px-4 py-2 rounded-lg font-black border ${activeTab === tab ? 'bg-slate-900 text-white border-slate-900' : 'bg-white text-slate-700 border-slate-200'}`}>
              {tab}
            </button>
          ))}
        </div>

        {saveMessage && <div className="mb-5 bg-white border border-slate-200 rounded-lg p-4 font-bold text-slate-700">{saveMessage}</div>}

        <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] gap-5">
          <section className="space-y-5">
            {activeTab === 'Profile' && (
              <SettingsCard title="Profile">
                <Field label="Display name" value={authUser?.email || userProfile.name} />
                <Field label="City" value={userProfile.city} />
                <Field label="Role" value={userProfile.role} />
                <Field label="Phone number" value={otpPhone} onChange={setOtpPhone} />
                <Field label="Preferred language" value="English" />
              </SettingsCard>
            )}

            {activeTab === 'Security' && (
              <SettingsCard title="Security">
                <Toggle label="Two-factor authentication" />
                <Toggle label="Login alerts" defaultChecked />
                <Toggle label="Require KYC before high-value bids" defaultChecked />
                <Toggle label="Hide phone until deal is accepted" defaultChecked />
                <Toggle label="Block suspicious bidding/session activity" defaultChecked />
                <Field label="Recovery email" value={authUser?.email || 'buyer@example.com'} />

                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-black uppercase text-slate-400">Phone verification</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-[1fr_180px]">
                    <input
                      value={otpPhone}
                      onChange={(event) => setOtpPhone(event.target.value)}
                      placeholder="+92 300 0000000"
                      className="w-full border border-slate-200 rounded-lg p-3 font-bold outline-none focus:border-blue-600"
                    />
                    <button onClick={startOtpVerification} disabled={isOtpSubmitting || otpResendCooldown > 0} className="rounded-lg bg-slate-900 text-white font-black px-4 py-3 disabled:bg-slate-300">
                      {isOtpSubmitting ? 'Sending...' : otpChallenge ? (otpResendCooldown > 0 ? `Resend in ${otpResendCooldown}s` : 'Resend OTP') : 'Start OTP'}
                    </button>
                  </div>
                  {otpChallenge && (
                    <p className="mt-2 text-xs font-bold text-slate-500">
                      {otpChallenge.devCode ? `Dev code ${otpChallenge.devCode}. ` : ''}Challenge expires in {formatSeconds(otpTimeLeft)}.
                    </p>
                  )}
                  <div className="mt-3 grid gap-3 md:grid-cols-[1fr_180px]">
                    <input
                      value={otpCode}
                      onChange={(event) => setOtpCode(event.target.value)}
                      placeholder={otpChallenge?.devCode ? `Dev code: ${otpChallenge.devCode}` : 'Enter OTP code'}
                      className="w-full border border-slate-200 rounded-lg p-3 font-bold outline-none focus:border-blue-600"
                    />
                    <button onClick={verifyOtpCode} disabled={isOtpSubmitting} className="rounded-lg border border-blue-200 text-blue-700 font-black px-4 py-3 disabled:border-slate-200 disabled:text-slate-400">
                      {isOtpSubmitting ? 'Verifying...' : 'Verify OTP'}
                    </button>
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-black uppercase text-slate-400">Active sessions</p>
                  <div className="mt-3 space-y-2">
                    {sessions.length ? sessions.map((session) => (
                      <div key={session.id} className="rounded-lg bg-slate-50 border border-slate-100 px-3 py-3 flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                        <div>
                          <p className="font-black text-slate-900">{session.deviceName || session.userAgent || 'Browser session'} {session.current ? '(current)' : ''}</p>
                          <p className="text-xs font-bold text-slate-500">
                            Expires {session.expiresAt ? new Date(session.expiresAt).toLocaleString() : 'soon'} | {session.status || 'active'}
                          </p>
                        </div>
                        {!session.current && (
                          <button onClick={() => revokeSession(session.id)} className="rounded-lg border border-red-200 px-3 py-2 text-sm font-black text-red-700 hover:bg-red-50">
                            Revoke
                          </button>
                        )}
                      </div>
                    )) : (
                      <p className="text-sm font-bold text-slate-500">No extra sessions recorded yet.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-black uppercase text-slate-400">Connected sign-in providers</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    {providers.length ? providers.map((provider) => {
                      const linkedRecord = linkedProviders.find((item) => item.provider === provider.provider);
                      const linked = Boolean(linkedRecord || provider.linked);
                      return (
                        <div key={provider.provider} className="rounded-lg border border-slate-100 bg-slate-50 p-3">
                          <p className="font-black text-slate-900 capitalize">{provider.provider.replace('_', ' ')}</p>
                          <p className="text-xs font-bold text-slate-500 mt-1">
                            {provider.configured ? `Ready via ${provider.mode}` : 'Waiting for production credentials'}
                          </p>
                          {provider.link?.displayName || provider.link?.email ? (
                            <p className="mt-2 text-xs font-bold text-slate-600">
                              {provider.link?.displayName || provider.link?.email}
                            </p>
                          ) : null}
                          {linked && (
                            <p className="mt-2 text-xs font-bold text-emerald-700">
                              Linked {linkedRecord?.updatedAt ? `- ${new Date(linkedRecord.updatedAt).toLocaleString()}` : ''}
                            </p>
                          )}
                          <button
                            onClick={() => linkProvider(provider.provider)}
                            disabled={!provider.configured || linked}
                            className="mt-3 rounded-lg border border-blue-200 px-3 py-2 text-sm font-black text-blue-700 disabled:border-slate-200 disabled:text-slate-400"
                          >
                            {linked ? 'Linked' : provider.configured ? 'Link provider' : 'Unavailable'}
                          </button>
                        </div>
                      );
                    }) : (
                      <p className="text-sm font-bold text-slate-500">Provider adapters will appear here once the backend config is connected.</p>
                    )}
                  </div>
                </div>

                <div className="rounded-lg border border-slate-200 p-4">
                  <p className="text-xs font-black uppercase text-slate-400">Provider readiness</p>
                  <div className="mt-3 grid gap-3 md:grid-cols-2">
                    <Status label="KYC provider" value={platformContracts?.providers?.kyc?.provider || 'manual_review'} />
                    <Status label="Liveness" value={platformContracts?.providers?.kyc?.livenessProvider || 'placeholder_adapter'} />
                    <Status label="Consent version" value={platformContracts?.compliance?.consentTextVersion || 'kyc-consent-v1'} />
                    <Status label="Bank auctions" value={platformContracts?.compliance?.publicBankAuctionsEnabled ? 'Enabled' : 'Disabled'} />
                  </div>
                </div>

                <button onClick={signOut} className="w-full border border-red-200 text-red-700 rounded-lg p-3 font-black hover:bg-red-50">Log Out</button>
              </SettingsCard>
            )}

            {activeTab === 'Privacy' && (
              <SettingsCard title="Privacy controls">
                <Toggle label="Show my profile in community" defaultChecked />
                <Toggle label="Allow followers" defaultChecked />
                <Toggle label="Allow sellers to message me after inquiry" defaultChecked />
                <Toggle label="Share approximate city only" defaultChecked />
                <Toggle label="Personalize recommendations from views and saves" defaultChecked />
                <Toggle label="Allow social sharing of my public posts" defaultChecked />
                <Field label="Blocked words / brands" value="" />
              </SettingsCard>
            )}

            {activeTab === 'KYC' && (
              <SettingsCard title="KYC">
                <Status label="Identity" value={kycProfile?.status || verification?.kycProfile?.status || 'Not started'} />
                <Status label="Phone" value={verification?.verificationLevel === 'email_phone_verified' || verification?.verificationLevel === 'kyc_verified' || verification?.verificationLevel === 'dealer_verified' ? 'Verified' : 'Pending OTP'} />
                <Status label="Dealer verification" value={verification?.verificationLevel === 'dealer_verified' ? 'Verified' : 'Optional'} />
                <Status label="Consent version" value={kycProfile?.consentTextVersion || platformContracts?.compliance?.consentTextVersion || 'kyc-consent-v1'} />
                <Status label="Review mode" value={kycProfile?.provider || platformContracts?.providers?.kyc?.provider || 'manual_review'} />

                <label className="block">
                  <span className="text-xs font-black uppercase text-slate-400">Document type</span>
                  <select value={kycForm.documentType} onChange={(event) => setKycForm((current) => ({ ...current, documentType: event.target.value }))} className="mt-1 w-full border border-slate-200 rounded-lg p-3 font-bold outline-none focus:border-blue-600 bg-white">
                    <option value="cnic">CNIC</option>
                    <option value="government_id">Government ID</option>
                    <option value="passport">Passport</option>
                    <option value="driving_license">Driving license</option>
                    <option value="selfie_liveness">Selfie / liveness</option>
                    <option value="dealer_ntn">Dealer NTN</option>
                    <option value="business_registration">Business registration</option>
                    <option value="seller_bank_proof">Seller bank proof</option>
                    <option value="vehicle_ownership">Vehicle ownership proof</option>
                  </select>
                </label>

                <label className="flex items-center gap-3 rounded-lg border border-slate-200 p-3">
                  <input
                    type="checkbox"
                    checked={kycForm.consentAccepted}
                    onChange={(event) => setKycForm((current) => ({ ...current, consentAccepted: event.target.checked }))}
                  />
                  <span className="font-bold text-slate-700">I consent to KYC review, document verification, and private admin handling of identity documents.</span>
                </label>

                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-black uppercase text-slate-400">Trust notice</p>
                  <p className="mt-2 text-sm font-bold text-slate-700">
                    Sensitive identity media stays private. Current consent text version is {kycProfile?.consentTextVersion || platformContracts?.compliance?.consentTextVersion || 'kyc-consent-v1'}, and the review rail is {kycProfile?.provider || platformContracts?.providers?.kyc?.provider || 'manual_review'}.
                  </p>
                </div>

                <label className="block border border-dashed border-slate-300 rounded-lg p-4 cursor-pointer hover:border-blue-600">
                  <span className="text-xs font-black uppercase text-slate-400">CNIC / dealer document</span>
                  <span className="block mt-1 font-bold text-slate-700">{isKycUploading ? 'Uploading document...' : kycFile || 'Upload document for review'}</span>
                  <input type="file" accept="image/*,.pdf" onChange={(event) => uploadKyc(event.target.files?.[0])} className="hidden" />
                </label>
              </SettingsCard>
            )}

            {activeTab === 'Payments' && (
              <SettingsCard title="Payments">
                <p className="text-sm font-bold text-slate-500">Add payout and buyer payment methods for sandbox review. Real banking release still depends on provider integration.</p>
                {paymentProviders.length ? (
                  <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
                    {paymentProviders.map((provider) => (
                      <div key={provider.id} className="rounded-lg border border-slate-200 bg-slate-50 p-4">
                        <p className="text-sm font-black text-slate-900">{provider.label}</p>
                        <p className="mt-1 text-xs font-bold text-slate-500">{provider.description}</p>
                        <div className="mt-3 flex flex-wrap gap-2">
                          <span className="rounded-full bg-white px-3 py-1 text-[11px] font-black text-slate-700 border border-slate-200">{provider.mode}</span>
                          <span className={`rounded-full px-3 py-1 text-[11px] font-black ${provider.sandboxReady ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}`}>
                            {provider.sandboxReady ? 'sandbox ready' : 'adapter pending'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : null}
                <div className="grid gap-3 md:grid-cols-3">
                  <label className="block">
                    <span className="text-xs font-black uppercase text-slate-400">Provider</span>
                    <select value={paymentForm.provider} onChange={(event) => setPaymentForm((current) => ({ ...current, provider: event.target.value }))} className="mt-1 w-full border border-slate-200 rounded-lg p-3 font-bold outline-none focus:border-blue-600 bg-white">
                      {(paymentProviders.length ? paymentProviders : fallbackPaymentProviders).map((provider) => (
                        <option key={provider.id} value={provider.id}>{provider.label}</option>
                      ))}
                    </select>
                  </label>
                  <Field label="Label" value={paymentForm.label} onChange={(value) => setPaymentForm((current) => ({ ...current, label: value }))} />
                  <Field label={paymentReferenceLabel(paymentForm.provider)} value={paymentForm.maskedReference} onChange={(value) => setPaymentForm((current) => ({ ...current, maskedReference: value }))} />
                </div>
                <div className="grid gap-3 md:grid-cols-2 mt-3">
                  {paymentForm.provider === 'bank_transfer' && (
                    <>
                      <Field label="Account title" value={paymentForm.accountTitle} onChange={(value) => setPaymentForm((current) => ({ ...current, accountTitle: value }))} />
                      <Field label="Account number" value={paymentForm.accountNumber} onChange={(value) => setPaymentForm((current) => ({ ...current, accountNumber: value }))} />
                      <Field label="IBAN" value={paymentForm.iban} onChange={(value) => setPaymentForm((current) => ({ ...current, iban: value }))} />
                      <Field label="Branch / bank" value={paymentForm.branchName} onChange={(value) => setPaymentForm((current) => ({ ...current, branchName: value }))} />
                    </>
                  )}
                  {(paymentForm.provider === 'easypaisa' || paymentForm.provider === 'jazzcash') && (
                    <>
                      <Field label="Account title" value={paymentForm.accountTitle} onChange={(value) => setPaymentForm((current) => ({ ...current, accountTitle: value }))} />
                      <Field label="Wallet phone number" value={paymentForm.phoneNumber} onChange={(value) => setPaymentForm((current) => ({ ...current, phoneNumber: value }))} />
                    </>
                  )}
                  {paymentForm.provider === 'card_gateway' && (
                    <>
                      <Field label="Merchant label" value={paymentForm.accountTitle} onChange={(value) => setPaymentForm((current) => ({ ...current, accountTitle: value }))} />
                      <Field label="Gateway reference" value={paymentForm.accountNumber} onChange={(value) => setPaymentForm((current) => ({ ...current, accountNumber: value }))} />
                    </>
                  )}
                </div>
                <div className="rounded-lg border border-slate-200 bg-slate-50 p-4 mt-3">
                  <p className="text-xs font-black uppercase text-slate-400">Provider mode</p>
                  <p className="mt-2 text-sm font-bold text-slate-700">{paymentProviderGuidance(paymentForm.provider)}</p>
                </div>
                <button onClick={savePaymentMethod} disabled={isPaymentSaving} className="w-full rounded-lg bg-emerald-500 text-slate-950 font-black py-3 disabled:bg-slate-300">
                  {isPaymentSaving ? 'Saving...' : 'Add Payment Method'}
                </button>

                <div className="grid gap-3 lg:grid-cols-2">
                  <InfoList title="Saved payment methods" items={paymentMethods.map((method) => `${method.label} - ${method.providerLabel || method.provider} - ${method.status}${method.providerMode ? ` - ${method.providerMode}` : ''}${method.maskedReference ? ` - ${method.maskedReference}` : ''}`)} empty="No payment methods added yet." />
                  <InfoList title="Recent payment transactions" items={paymentTransactions.slice(0, 5).map((transaction) => `${transaction.transactionType || 'payment'} - ${transaction.status} - PKR ${Number(transaction.amount || 0).toLocaleString()}`)} empty="No payment transactions yet." />
                </div>
              </SettingsCard>
            )}

            {activeTab === 'Notifications' && (
              <SettingsCard title="Notification preferences">
                <Toggle label="Auction ending alerts" defaultChecked />
                <Toggle label="Outbid alerts" defaultChecked />
                <Toggle label="Community replies" defaultChecked />
                <Toggle label="Accessory fitment deals" />
                <Toggle label="Inspection booking reminders" defaultChecked />
                <Toggle label="Payment and dispute updates" defaultChecked />
              </SettingsCard>
            )}

            <button onClick={saveSettings} className="bg-blue-600 text-white rounded-lg px-5 py-3 font-black hover:bg-blue-700">Save Settings</button>
          </section>

          <aside className="bg-white border border-slate-200 rounded-xl p-5 h-fit">
            <p className="text-xs font-black uppercase text-slate-400">Account status</p>
            <div className="mt-4 space-y-3">
              <Status label="Session" value={authUser ? 'Backend account' : 'Demo user'} />
              <Status label="API" value={backendStatus.available ? 'Connected' : 'Offline'} />
              <Status label="Verification" value={verification?.verificationLevel || 'registered'} />
              <Status label="KYC" value={kycProfile?.status || verification?.kycProfile?.status || 'not_started'} />
              <Status label="Trust score" value={`${userProfile.reputation}/100`} />
              <Status label="Badges" value={userProfile.badges.join(', ')} />
            </div>
          </aside>
        </div>
      </section>
    </main>
  );
};

const apiHttpSubmitKyc = (api, payload) => {
  if (api.verification?.submitKyc) return api.verification.submitKyc(payload);
  if (api.trust?.submitKyc) return api.trust.submitKyc(payload);
  if (api.auth?.submitKyc) return api.auth.submitKyc(payload);
  return fetchWithApiFallback(payload);
};

const fetchWithApiFallback = async (payload) => {
  const base = process.env.REACT_APP_API_URL || 'http://localhost:4000/api';
  const token = window.localStorage.getItem('wheels_deals_auth_token');
  const response = await fetch(`${base}/kyc/submit`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(payload),
  });
  const result = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(result.message || 'KYC submission failed.');
  return result;
};

const SettingsCard = ({ title, children }) => (
  <section className="bg-white border border-slate-200 rounded-xl p-5">
    <h2 className="text-xl font-black text-slate-900 mb-4">{title}</h2>
    <div className="space-y-3">{children}</div>
  </section>
);

const Field = ({ label, value, onChange = null }) => (
  <label className="block">
    <span className="text-xs font-black uppercase text-slate-400">{label}</span>
    <input
      value={value}
      onChange={onChange ? (event) => onChange(event.target.value) : undefined}
      readOnly={!onChange}
      className="mt-1 w-full border border-slate-200 rounded-lg p-3 font-bold outline-none focus:border-blue-600"
    />
  </label>
);

const Toggle = ({ label, defaultChecked }) => (
  <label className="flex items-center justify-between gap-4 border border-slate-100 rounded-lg p-3">
    <span className="font-bold text-slate-700">{label}</span>
    <input type="checkbox" defaultChecked={defaultChecked} />
  </label>
);

const Status = ({ label, value }) => (
  <div className="flex justify-between gap-4 border border-slate-100 rounded-lg p-3">
    <span className="font-bold text-slate-500">{label}</span>
    <span className="font-black text-slate-900 text-right">{value}</span>
  </div>
);

const InfoList = ({ title, items, empty }) => (
  <div className="rounded-lg border border-slate-200 p-4">
    <p className="text-sm font-black text-slate-900">{title}</p>
    <div className="mt-3 space-y-2">
      {items.length ? items.map((item) => (
        <div key={item} className="rounded-lg bg-slate-50 px-3 py-2 text-sm font-bold text-slate-700">
          {item}
        </div>
      )) : <p className="text-sm font-bold text-slate-500">{empty}</p>}
    </div>
  </div>
);

export default AccountSettings;

function buildPaymentMethodPayload(form) {
  const metadata = {};
  if (form.accountTitle) metadata.accountTitle = form.accountTitle;
  if (form.accountNumber) metadata.accountNumber = form.accountNumber;
  if (form.iban) metadata.iban = form.iban;
  if (form.branchName) metadata.branchName = form.branchName;
  if (form.phoneNumber) metadata.phoneNumber = form.phoneNumber;

  return {
    provider: form.provider,
    label: form.label.trim(),
    maskedReference: form.maskedReference.trim(),
    metadata,
  };
}

function paymentReferenceLabel(provider) {
  if (provider === 'bank_transfer') return 'Masked account / IBAN';
  if (provider === 'easypaisa' || provider === 'jazzcash') return 'Masked wallet number';
  if (provider === 'card_gateway') return 'Gateway merchant reference';
  return 'Masked reference';
}

function paymentProviderGuidance(provider) {
  if (provider === 'bank_transfer') return 'Use this for IBFT or bank payout review. Admin will verify account title, bank details, and transfer references before release.';
  if (provider === 'easypaisa') return 'Sandbox-ready wallet path for Pakistan. Store only masked wallet details and transaction references, never raw secrets.';
  if (provider === 'jazzcash') return 'Parallel mobile-wallet flow for payout and buyer settlement review. Keep masked wallet identifiers only.';
  if (provider === 'card_gateway') return 'Adapter-first merchant gateway path. This stores merchant references only and does not store card numbers.';
  return 'Manual high-value settlement path for controlled beta operations and admin-side verification.';
}

function formatSeconds(seconds) {
  const safe = Math.max(0, Number(seconds) || 0);
  const minutes = Math.floor(safe / 60);
  const remainder = safe % 60;
  return `${String(minutes).padStart(2, '0')}:${String(remainder).padStart(2, '0')}`;
}


