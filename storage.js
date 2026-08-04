(() => {
  'use strict';

  const PREFIX = 'novaKredit.';
  const KEYS = Object.freeze({
    session: PREFIX + 'session',
    identity: PREFIX + 'identity',
    application: PREFIX + 'application'
  });

  const safeParse = (value, fallback = null) => {
    try { return value ? JSON.parse(value) : fallback; }
    catch { return fallback; }
  };

  const write = (key, value) => {
    try {
      localStorage.setItem(key, JSON.stringify(value));
      return true;
    } catch (error) {
      console.error('Gagal menyimpan data lokal:', error);
      return false;
    }
  };

  const read = (key, fallback = null) => safeParse(localStorage.getItem(key), fallback);

  const normalizeText = value => String(value ?? '').trim().replace(/\s+/g, ' ');

  const api = {
    keys: KEYS,
    setSession(data) {
      return write(KEYS.session, {
        identity: normalizeText(data.identity),
        remember: Boolean(data.remember),
        authenticatedAt: new Date().toISOString()
      });
    },
    getSession() { return read(KEYS.session, null); },
    clearSession() { localStorage.removeItem(KEYS.session); },

    setIdentity(data) {
      const payload = {
        fullName: normalizeText(data.fullName),
        nik: String(data.nik ?? '').replace(/\D/g, '').slice(0, 16),
        motherName: normalizeText(data.motherName),
        updatedAt: new Date().toISOString()
      };

      const ok = write(KEYS.identity, payload);

      // Kompatibilitas dengan file lama yang sudah memakai key berikut.
      if (ok) {
        localStorage.setItem('userNama', payload.fullName);
        localStorage.setItem('userNik', payload.nik);
        localStorage.setItem('motherName', payload.motherName);
      }
      return ok;
    },
    getIdentity() {
      const current = read(KEYS.identity, null);
      if (current) return current;

      const legacy = {
        fullName: normalizeText(localStorage.getItem('userNama')),
        nik: String(localStorage.getItem('userNik') || '').replace(/\D/g, ''),
        motherName: normalizeText(localStorage.getItem('motherName'))
      };
      return legacy.fullName || legacy.nik || legacy.motherName ? legacy : null;
    },
    clearIdentity() {
      localStorage.removeItem(KEYS.identity);
      ['userNama', 'userNik', 'motherName'].forEach(key => localStorage.removeItem(key));
    },

    setApplication(data) {
      const current = this.getApplication();
      return write(KEYS.application, {
        ...current,
        ...data,
        updatedAt: new Date().toISOString()
      });
    },

    getApplication() {
      const defaults = {
        applicationId: 'LN-2026-008421',
        currentStep: 'SMS_VERIFIED',
        status: 'DRAFT',
        limit: 75000000,
        annualRate: 12,
        smsVerified: false,
        smsVerifiedAt: null,
        documentsCompleted: false,
        documentsCompletedAt: null,
        loan: {
          amount: 25000000,
          tenor: 12,
          annualRate: 12,
          purpose: 'Modal Usaha',
          monthlyInstallment: 0,
          totalPayment: 0
        },
        summaryConfirmed: false,
        summaryConfirmedAt: null,
        pinConfirmed: false,
        pinConfirmedAt: null,
        processingStage: null,
        processingStartedAt: null,
        processingCompletedAt: null,
        resultAvailable: false,
        result: {
          status: 'APPROVED_DEMO',
          title: 'Pengajuan Berhasil Diproses',
          message: 'Data demonstrasi telah selesai diproses.',
          approvedAmount: 25000000
        }
      };
      const stored = read(KEYS.application, null);
      return stored
        ? {
            ...defaults,
            ...stored,
            loan: { ...defaults.loan, ...(stored.loan || {}) },
            result: { ...defaults.result, ...(stored.result || {}) }
          }
        : defaults;
    },

    resetApplicationFlow() {
      const current = this.getApplication();
      return write(KEYS.application, {
        ...current,
        currentStep: 'SMS_VERIFIED',
        status: 'DRAFT',
        documentsCompleted: false,
        documentsCompletedAt: null,
        summaryConfirmed: false,
        summaryConfirmedAt: null,
        pinConfirmed: false,
        pinConfirmedAt: null,
        processingStage: null,
        processingStartedAt: null,
        processingCompletedAt: null,
        resultAvailable: false,
        updatedAt: new Date().toISOString()
      });
    },

    setStep(step, patch = {}) {
      return this.setApplication({
        currentStep: step,
        ...patch
      });
    },

    setSmsVerified(value = true) {
      return this.setStep(value ? 'SMS_VERIFIED' : 'IDENTITY_COMPLETED', {
        smsVerified: Boolean(value),
        smsVerifiedAt: value ? new Date().toISOString() : null,
        status: value ? 'DRAFT' : 'IDENTITY_COMPLETED'
      });
    },

    setDocumentsCompleted(value = true) {
      return this.setStep(value ? 'DOCUMENTS_COMPLETED' : 'SMS_VERIFIED', {
        documentsCompleted: Boolean(value),
        documentsCompletedAt: value ? new Date().toISOString() : null,
        status: value ? 'DOCUMENTS_COMPLETED' : 'DRAFT'
      });
    },

    setLoan(data) {
      const current = this.getApplication();
      return this.setStep('LOAN_FORM_COMPLETED', {
        loan: { ...current.loan, ...data },
        summaryConfirmed: false,
        pinConfirmed: false,
        resultAvailable: false,
        status: 'LOAN_FORM_COMPLETED'
      });
    },

    confirmSummary() {
      return this.setStep('SUMMARY_CONFIRMED', {
        summaryConfirmed: true,
        summaryConfirmedAt: new Date().toISOString(),
        pinConfirmed: false,
        resultAvailable: false,
        status: 'SUMMARY_CONFIRMED'
      });
    },

    confirmPin() {
      return this.setStep('PIN_CONFIRMED', {
        pinConfirmed: true,
        pinConfirmedAt: new Date().toISOString(),
        processingStage: null,
        resultAvailable: false,
        status: 'PIN_CONFIRMED'
      });
    },

    startProcessing() {
      return this.setStep('SUBMISSION_PROCESSING', {
        processingStage: 'IDENTITY_VALIDATION',
        processingStartedAt: new Date().toISOString(),
        processingCompletedAt: null,
        resultAvailable: false,
        status: 'PROCESSING'
      });
    },

    updateProcessingStage(stage) {
      return this.setStep('SUBMISSION_PROCESSING', {
        processingStage: stage,
        status: 'PROCESSING'
      });
    },

    completeProcessing() {
      const current = this.getApplication();
      return this.setStep('RESULT_AVAILABLE', {
        processingStage: 'COMPLETED',
        processingCompletedAt: new Date().toISOString(),
        resultAvailable: true,
        status: current.result.status,
        result: {
          ...current.result,
          approvedAmount: current.loan.amount
        }
      });
    },

    requireSession(redirect = 'index.html') {
      if (!this.getSession()) {
        window.location.replace(redirect);
        return false;
      }
      return true;
    },

    requireIdentity(redirect = 'form-nik.html') {
      const identity = this.getIdentity();
      if (!identity || !identity.fullName || !/^\d{16}$/.test(identity.nik || '')) {
        window.location.replace(redirect);
        return false;
      }
      return true;
    },

    requireSmsVerification(redirect = 'verifikasi-sms.html') {
      if (!this.getApplication().smsVerified) {
        window.location.replace(redirect);
        return false;
      }
      return true;
    },

    requireDocuments(redirect = 'upload-dokumen.html') {
      if (!this.getApplication().documentsCompleted) {
        window.location.replace(redirect);
        return false;
      }
      return true;
    },

    requireLoan(redirect = 'form-pinjaman.html') {
      const app = this.getApplication();
      if (!app.loan || app.currentStep === 'DOCUMENTS_COMPLETED') {
        window.location.replace(redirect);
        return false;
      }
      return true;
    },

    requireSummary(redirect = 'ringkasan-pengajuan.html') {
      if (!this.getApplication().summaryConfirmed) {
        window.location.replace(redirect);
        return false;
      }
      return true;
    },

    requirePin(redirect = 'konfirmasi-pin.html') {
      if (!this.getApplication().pinConfirmed) {
        window.location.replace(redirect);
        return false;
      }
      return true;
    },

    requireProcessing(redirect = 'proses-pengajuan.html') {
      const app = this.getApplication();
      if (!['SUBMISSION_PROCESSING', 'RESULT_AVAILABLE'].includes(app.currentStep)) {
        window.location.replace(redirect);
        return false;
      }
      return true;
    },

    requireResult(redirect = 'proses-pengajuan.html') {
      if (!this.getApplication().resultAvailable) {
        window.location.replace(redirect);
        return false;
      }
      return true;
    },

    maskNik(nik) {
      const digits = String(nik || '').replace(/\D/g, '');
      if (digits.length !== 16) return 'NIK belum tersedia';
      return `NIK ${digits.slice(0,4)} •••• •••• ${digits.slice(-4)}`;
    },
    initials(name) {
      return normalizeText(name).split(' ').filter(Boolean).slice(0,2)
        .map(part => part.charAt(0).toUpperCase()).join('') || 'P';
    }
  };

  window.NovaStorage = Object.freeze(api);
})();
