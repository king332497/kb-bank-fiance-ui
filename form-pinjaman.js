(() => {
  if (!NovaStorage.requireSession()) return;
  if (!NovaStorage.requireIdentity()) return;
  if (!NovaStorage.requireSmsVerification()) return;
  if (!NovaStorage.requireDocuments()) return;

  const amount = document.getElementById('amount');
const tenor = document.getElementById('tenor');
const purpose = document.getElementById('purpose');
const monthly = document.getElementById('monthly');
const annualRate = 12;


amount?.addEventListener("input", () => {

    const value = Number(amount.value);

    const application = NovaStorage.getApplication() || {};

    application.limit = value;

    NovaStorage.setApplication(application);

});

  const rupiah = value => new Intl.NumberFormat('id-ID',{style:'currency',currency:'IDR',maximumFractionDigits:0}).format(value);

  function calculate() {
    const principal = Number(amount.value) || 0;
    const months = Number(tenor.value) || 1;
    const r = annualRate / 100 / 12;
    const payment = principal * r * Math.pow(1+r,months) / (Math.pow(1+r,months)-1);
    monthly.textContent = rupiah(payment || 0);
    return {payment,total:payment*months};
  }

  [amount,tenor].forEach(el => el.addEventListener('input',calculate));
  calculate();

  document.getElementById('loanForm').addEventListener('submit', event => {
    event.preventDefault();

    const calc = calculate();

    const amountValue = Number(amount.value);

    NovaStorage.setLoan({
      amount: amountValue,
      tenor: Number(tenor.value),
      purpose: purpose.value,
      annualRate,
      monthlyInstallment: Math.round(calc.payment),
      totalPayment: Math.round(calc.total)
    });

   const application = NovaStorage.getApplication() || {};
const amountValue = Number(amount.value);

console.log("PINJAMAN DIPILIH:", amountValue);

NovaStorage.setApplication({
  ...application,
  limit: amountValue
});

window.location.replace('ringkasan-pengajuan.html');

  document.getElementById('backButton').addEventListener('click', () => history.back());
})();
