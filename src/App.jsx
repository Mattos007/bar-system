import React, { useEffect, useMemo, useState } from "react";
import {
  Beer,
  ClipboardList,
  Package,
  CircleDollarSign,
  Trash2,
  Plus,
  Users,
  BarChart3,
  AlertTriangle,
  CheckCircle2,
  Info,
  LockKeyhole,
  Pencil,
  Download,
  ArrowDownCircle,
  ArrowUpCircle,
  Printer,
  Receipt,
  LogIn,
  Search,
  HandCoins,
  Wallet,
  Gamepad2,
  LogOut,
} from "lucide-react";
import { supabase } from "./lib/supabase";

const fichaPrice = 3;
const protectedActionPassword = "1234";

const emptyCloseForm = {
  paymentMethod: "Dinheiro",
  splitPeople: 2,
  amountReceived: 0,
  table: "Nenhuma",
  fiadoCustomer: "",
  tokenQuantity: 0,
};

const currency = (value) =>
  new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(Number(value || 0));

const formatDateTime = (value = new Date().toISOString()) => {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(date);
};

const normalizeCustomerName = (value = "") =>
  String(value || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, " ")
    .trim()
    .toLocaleLowerCase("pt-BR");

const cleanCustomerName = (value = "") => String(value || "").replace(/\s+/g, " ").trim();

function mergeItemsByProduct(items) {
  const map = new Map();

  for (const item of items || []) {
    const key = item.productId ?? item.name;
    if (!map.has(key)) {
      map.set(key, {
        ...item,
        quantity: Number(item.quantity || 0),
      });
    } else {
      const current = map.get(key);
      current.quantity += Number(item.quantity || 0);
      map.set(key, current);
    }
  }

  return Array.from(map.values());
}

function ActionButton({
  children,
  onClick,
  variant = "dark",
  type = "button",
  disabled = false,
}) {
  const styles = {
    dark: "bg-slate-900 text-white hover:bg-slate-800",
    emerald: "bg-emerald-600 text-white hover:bg-emerald-500",
    amber: "bg-amber-400 text-slate-950 hover:bg-amber-300",
    sky: "bg-sky-600 text-white hover:bg-sky-500",
    rose: "bg-rose-600 text-white hover:bg-rose-500",
    light: "bg-white text-slate-900 ring-1 ring-slate-300 hover:bg-slate-50",
    violet: "bg-violet-600 text-white hover:bg-violet-500",
    fuchsia: "bg-fuchsia-600 text-white hover:bg-fuchsia-500",
    cyan: "bg-cyan-600 text-white hover:bg-cyan-500",
  };

  return (
    <button
      type={type}
      disabled={disabled}
      onClick={onClick}
      className={`rounded-2xl px-4 py-2 font-semibold transition-all duration-300 hover:-translate-y-[1px] hover:shadow-md active:scale-[0.97] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-none ${styles[variant]}`}
    >
      {children}
    </button>
  );
}

function Section({ title, subtitle, action, children }) {
  return (
    <section className="overflow-hidden rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-xl font-bold text-slate-900">{title}</h2>
          {subtitle ? <p className="mt-1 text-sm text-slate-500">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

function StatCard({ title, value, subtitle, icon: Icon }) {
  return (
    <div className="rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm text-slate-500">{title}</p>
          <h3 className="mt-2 text-3xl font-bold text-slate-900">{value}</h3>
          <p className="mt-2 text-sm text-slate-500">{subtitle}</p>
        </div>
        <div className="rounded-2xl bg-slate-100 p-3 text-slate-700">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function PageTab({ label, active, onClick, colorClass, hasAlert = false, icon: Icon }) {
  return (
    <button
      onClick={onClick}
      className={`relative inline-flex items-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold transition-all duration-300 active:scale-[0.97] ${
        active
          ? `${colorClass} text-white shadow-lg -translate-y-[1px]`
          : "bg-white text-slate-700 ring-1 ring-slate-200 hover:bg-slate-50 hover:-translate-y-[1px]"
      }`}
    >
      {Icon ? <Icon size={16} /> : null}
      <span>{label}</span>
      {hasAlert ? (
        <span className="absolute right-2 top-2 h-2.5 w-2.5 rounded-full bg-red-500" />
      ) : null}
    </button>
  );
}

export default function App() {
  const [auth, setAuth] = useState({ isAuthenticated: false, user: null });
  const [loginForm, setLoginForm] = useState({ user: "", password: "" });
  const [loginLoading, setLoginLoading] = useState(false);

  const [activePage, setActivePage] = useState("dashboard");
  const [menuAlerts, setMenuAlerts] = useState({
    dashboard: false,
    comandas: false,
    produtos: false,
    sinuca: false,
    fiados: false,
    relatorios: false,
    caixa: false,
    movimentos: false,
  });

  const [products, setProducts] = useState([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [editingProductId, setEditingProductId] = useState(null);
  const [productSearch, setProductSearch] = useState("");
  const [quickSaleSearch, setQuickSaleSearch] = useState("");
  const [comandaSearch, setComandaSearch] = useState("");

  const [comandas, setComandas] = useState([]);
  const [fiados, setFiados] = useState([]);
  const [fiadosQuitados, setFiadosQuitados] = useState([]);

  const [mesa1, setMesa1] = useState({ total: 0, paid: 0, pending: 0, open: false });
  const [mesa2, setMesa2] = useState({ total: 0, paid: 0, pending: 0, open: false });
  const [mesaHistory, setMesaHistory] = useState([]);
  const [mesaFilterDays, setMesaFilterDays] = useState("7");

  const [selectedComandaId, setSelectedComandaId] = useState("");
  const [itemLines, setItemLines] = useState([{ productId: "", quantity: 1 }]);
  const [showAddProductsPanel, setShowAddProductsPanel] = useState(false);
  const [newComanda, setNewComanda] = useState({ customer: "" });

  const [productForm, setProductForm] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    category: "",
  });

  const [quickSaleItems, setQuickSaleItems] = useState([]);
  const [quickSaleForm, setQuickSaleForm] = useState({ productId: "", quantity: 1 });
  const [quickSale, setQuickSale] = useState({
    paymentMethod: "Dinheiro",
    amountReceived: 0,
    fiadoCustomer: "",
  });

  const [closeForm, setCloseForm] = useState(emptyCloseForm);
  const fiadoMesaStorageKey = "bar_fiado_mesa_map";

  const readFiadoMesaMap = () => {
    try {
      return JSON.parse(localStorage.getItem(fiadoMesaStorageKey) || "{}");
    } catch {
      return {};
    }
  };

  const saveFiadoMesaMap = (nextMap) => {
    try {
      localStorage.setItem(fiadoMesaStorageKey, JSON.stringify(nextMap || {}));
    } catch {}
  };

  const [cashOpen, setCashOpen] = useState(true);
  const [cashSessionStart, setCashSessionStart] = useState(() => {
    const saved = localStorage.getItem("bar_cash_session_start");
    return saved ? Number(saved) : Date.now();
  });
  const [cashEntries, setCashEntries] = useState([]);
  const [closedCashLaunchTotal, setClosedCashLaunchTotal] = useState(() => {
    const saved = localStorage.getItem("bar_closed_cash_launch_total");
    return saved ? Number(saved) : 0;
  });
  const [cash2Entries, setCash2Entries] = useState([]);
  const [cash2Form, setCash2Form] = useState({
    type: "Entrada",
    description: "",
    value: "",
  });

  const [withdrawals, setWithdrawals] = useState([]);
  const [withdrawalForm, setWithdrawalForm] = useState({
    value: "",
    description: "",
  });

  const [loans, setLoans] = useState([]);
  const [loanForm, setLoanForm] = useState({
    customer: "",
    value: "",
  });
  const [loanPartialInputs, setLoanPartialInputs] = useState({});

  const [cashFilterDays, setCashFilterDays] = useState("7");
  const [reportDateTime, setReportDateTime] = useState("");
  const [partialInputs, setPartialInputs] = useState({});
  const [mesaTokenInputs, setMesaTokenInputs] = useState({ mesa1: 1, mesa2: 1 });

  const [toast, setToast] = useState({ type: "info", text: "" });
  const [confirmModal, setConfirmModal] = useState({
    open: false,
    type: "info",
    title: "",
    message: "",
    onConfirm: null,
    requirePassword: false,
    password: "",
  });

  const [receiptModal, setReceiptModal] = useState({ open: false, data: null });

  const availableProducts = useMemo(
    () => products.filter((p) => Number(p.stock || 0) > 0),
    [products]
  );

  const filteredProducts = useMemo(() => {
    const term = productSearch.trim().toLowerCase();
    if (!term) return products;

    return products.filter((product) =>
      [product.name, product.description, product.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(term)
    );
  }, [products, productSearch]);

  const selectedComanda = useMemo(
    () => comandas.find((item) => String(item.id) === String(selectedComandaId)) || null,
    [comandas, selectedComandaId]
  );

  const selectedProductsTotal = useMemo(() => {
    if (!selectedComanda) return 0;
    return (selectedComanda.items || []).reduce(
      (sum, item) => sum + Number(item.quantity || 0) * Number(item.price || 0),
      0
    );
  }, [selectedComanda]);

  const selectedTableState =
    closeForm.table === "Mesa 1" ? mesa1 : closeForm.table === "Mesa 2" ? mesa2 : null;

  const requestedTokens = Math.max(0, Number(closeForm.tokenQuantity) || 0);
  const allowedTokens = selectedTableState ? selectedTableState.pending : 0;
  const validatedTokenQuantity =
    closeForm.table === "Nenhuma" || allowedTokens <= 0
      ? 0
      : Math.min(requestedTokens, allowedTokens);

  const closeTokensValue = validatedTokenQuantity * fichaPrice;
  const selectedTotal = selectedProductsTotal + closeTokensValue;
  const splitValue = selectedTotal / Math.max(1, Number(closeForm.splitPeople) || 1);

  const troco =
    closeForm.paymentMethod !== "Dinheiro"
      ? 0
      : Math.max(0, Number(closeForm.amountReceived || 0) - selectedTotal);

  const totalOpenSales = useMemo(
    () =>
      comandas.reduce(
        (sum, item) =>
          sum +
          (item.items || []).reduce(
            (s, i) => s + Number(i.quantity || 0) * Number(i.price || 0),
            0
          ),
        0
      ),
    [comandas]
  );

  const totalFiadoPending = useMemo(
    () => fiados.reduce((sum, item) => sum + Number(item.pending || 0), 0),
    [fiados]
  );

  const totalFiadoPaid = useMemo(
    () => fiadosQuitados.reduce((sum, item) => sum + Number(item.total || 0), 0),
    [fiadosQuitados]
  );

  const totalCashToday = useMemo(() => {
    if (!cashOpen) return 0;

    return cashEntries.reduce((sum, item) => {
      const total = Number(item.total || 0);
      if (total <= 0) return sum;
      if ((item.rawDate || 0) < Number(cashSessionStart || 0)) return sum;
      if (item.entryType !== "sale") return sum;
      return sum + total;
    }, 0);
  }, [cashEntries, cashOpen, cashSessionStart]);

  const totalGeneralEntries = useMemo(
    () => Number(closedCashLaunchTotal || 0),
    [closedCashLaunchTotal]
  );

  const lowStockProducts = useMemo(
    () => products.filter((item) => Number(item.stock || 0) <= 10),
    [products]
  );

  const topBeverages = useMemo(
    () =>
      [...products]
        .filter((item) => String(item.category || "").toLowerCase() === "bebidas")
        .sort((a, b) => Number(b.sold || 0) - Number(a.sold || 0))
        .slice(0, 5),
    [products]
  );

  const quickSaleTotal = useMemo(
    () => quickSaleItems.reduce((sum, item) => sum + Number(item.price) * Number(item.quantity), 0),
    [quickSaleItems]
  );

  const quickSaleTroco =
    quickSale.paymentMethod !== "Dinheiro"
      ? 0
      : Math.max(0, Number(quickSale.amountReceived || 0) - quickSaleTotal);

  const cash2Balance = useMemo(
    () =>
      cash2Entries.reduce(
        (sum, item) => sum + (item.type === "Entrada" ? Number(item.value) : -Number(item.value)),
        0
      ),
    [cash2Entries]
  );

  const availableCashBalance = useMemo(() => {
    return cashEntries.reduce((sum, item) => {
      if (item.entryType === "loan-payment") return sum;
      return sum + Number(item.total || 0);
    }, 0);
  }, [cashEntries]);

  const filteredCashEntries = useMemo(() => {
    const days = Number(cashFilterDays || 7);
    const baseTs = reportDateTime ? new Date(reportDateTime).getTime() : Date.now();
    const minTs = baseTs - days * 24 * 60 * 60 * 1000;

    return cashEntries.filter(
      (entry) => (entry.rawDate || 0) >= minTs && (entry.rawDate || 0) <= baseTs
    );
  }, [cashEntries, cashFilterDays, reportDateTime]);

  const filteredMesaHistory = useMemo(() => {
    const days = Number(mesaFilterDays || 7);
    const baseTs = Date.now();
    const minTs = baseTs - days * 24 * 60 * 60 * 1000;

    return mesaHistory.filter(
      (entry) => (entry.rawDate || 0) >= minTs && (entry.rawDate || 0) <= baseTs
    );
  }, [mesaHistory, mesaFilterDays]);

  const isMesaLinkedFiado = (item, mesaName) => {
    if (!item || item.tableName !== mesaName) return false;

    const pendingTokens = Number(item.pendingTokens || 0);
    if (pendingTokens <= 0) return false;

    return true;
  };

  const mesaPendingFiadoStats = useMemo(() => ({
    mesa1: fiados.reduce(
      (acc, item) => {
        if (!isMesaLinkedFiado(item, "Mesa 1")) return acc;
        const pendingTokens = Number(item.pendingTokens || 0);
        acc.tokens += pendingTokens;
        acc.total += pendingTokens * fichaPrice;
        return acc;
      },
      { tokens: 0, total: 0 }
    ),
    mesa2: fiados.reduce(
      (acc, item) => {
        if (!isMesaLinkedFiado(item, "Mesa 2")) return acc;
        const pendingTokens = Number(item.pendingTokens || 0);
        acc.tokens += pendingTokens;
        acc.total += pendingTokens * fichaPrice;
        return acc;
      },
      { tokens: 0, total: 0 }
    ),
  }), [fiados, fichaPrice]);

  const fiadoCustomerOptions = useMemo(() => {
    const seen = new Set();

    return [...fiados, ...fiadosQuitados].reduce((acc, fiado) => {
      const name = cleanCustomerName(fiado.customer);
      const normalized = normalizeCustomerName(name);
      if (!name || seen.has(normalized)) return acc;
      seen.add(normalized);
      acc.push(name);
      return acc;
    }, []);
  }, [fiados, fiadosQuitados]);

  const loanCustomerOptions = useMemo(() => {
    const seen = new Set();

    return loans.reduce((acc, loan) => {
      const name = cleanCustomerName(loan.customer);
      const normalized = normalizeCustomerName(name);
      if (!name || seen.has(normalized)) return acc;
      seen.add(normalized);
      acc.push(name);
      return acc;
    }, []);
  }, [loans]);

  const tabs = [
    { key: "dashboard", label: "Início", color: "bg-amber-500", icon: CircleDollarSign },
    { key: "comandas", label: "Comandas", color: "bg-sky-600", icon: ClipboardList },
    { key: "produtos", label: "Produtos", color: "bg-emerald-600", icon: Package },
    { key: "sinuca", label: "Mesas", color: "bg-violet-600", icon: Gamepad2 },
    { key: "fiados", label: "Fiados", color: "bg-rose-600", icon: Users },
    { key: "relatorios", label: "Relatórios", color: "bg-cyan-600", icon: BarChart3 },
    { key: "caixa", label: "Caixa", color: "bg-slate-800", icon: Wallet },
    { key: "movimentos", label: "Retirada / Empréstimo", color: "bg-fuchsia-600", icon: HandCoins },
  ];

  const toastStyles = {
    success: "bg-emerald-50 text-emerald-900 ring-emerald-200",
    warn: "bg-amber-50 text-amber-900 ring-amber-200",
    info: "bg-sky-50 text-sky-900 ring-sky-200",
  };

  const modalAccent =
    confirmModal.type === "warn"
      ? "bg-amber-50 text-amber-900 ring-amber-200"
      : "bg-sky-50 text-sky-900 ring-sky-200";

  const ConfirmIcon = confirmModal.type === "warn" ? AlertTriangle : Info;

  function notify(text, type = "info") {
    setToast({ text, type });
    setTimeout(() => {
      setToast((prev) => (prev.text === text ? { ...prev, text: "" } : prev));
    }, 3200);
  }

  function markMenuChanged(keys) {
    setMenuAlerts((prev) => {
      const next = { ...prev };
      for (const key of keys) next[key] = true;
      return next;
    });
  }

  function openPage(page) {
    setActivePage(page);
    setMenuAlerts((prev) => ({ ...prev, [page]: false }));
  }

  function openConfirm(config) {
    setConfirmModal({ open: true, password: "", ...config });
  }

  function closeConfirm() {
    setConfirmModal({
      open: false,
      type: "info",
      title: "",
      message: "",
      onConfirm: null,
      requirePassword: false,
      password: "",
    });
  }

  function runConfirm() {
    if (confirmModal.requirePassword && confirmModal.password !== protectedActionPassword) {
      notify("Senha inválida.", "warn");
      return;
    }

    const cb = confirmModal.onConfirm;
    closeConfirm();
    if (cb) cb();
  }

  function openReceipt(data) {
    setReceiptModal({ open: true, data });
  }

  function closeReceipt() {
    setReceiptModal({ open: false, data: null });
  }

  function buildFiadoReceiptData(fiado, statusLabel = "Pendente") {
    return {
      code: `FIADO-${String(fiado.id || "").slice(0, 8).toUpperCase() || "0000"}`,
      customer: fiado.customer,
      at: formatDateTime(),
      paymentMethod: statusLabel,
      amountReceived: 0,
      troco: 0,
      tokens: Number(fiado.pendingTokens || 0),
      total: Number(fiado.total || fiado.pending || 0) + Number(fiado.partialPaid || 0),
      products: mergeItemsByProduct(fiado.products || []),
      fiadoSummary: {
        status: statusLabel,
        partialPaid: Number(fiado.partialPaid || 0),
        pending: Number(fiado.pending || 0),
        total: Number(fiado.total || fiado.pending || 0) + Number(fiado.partialPaid || 0),
      },
      history: (fiado.history || []).map((item) => ({
        type: item.type,
        method: item.method,
        value: Number(item.value || 0),
        at: item.at,
      })),
    };
  }

  function downloadTextFile(filename, content) {
    const utf8Content = "\uFEFF" + content;
    const blob = new Blob([utf8Content], { type: "text/plain;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
    URL.revokeObjectURL(url);
  }

  function makeReportHeader(title) {
    const chosen = reportDateTime ? formatDateTime(new Date(reportDateTime)) : formatDateTime();
    return `${title}\nGerado em: ${chosen}\n\n`;
  }

  function handleEnterAction(event, action) {
    if (event.key === "Enter") {
      event.preventDefault();
      action();
    }
  }

  function filterProductsSmart(list, term) {
    const normalized = term.trim().toLowerCase();
    if (!normalized) return list;

    return list.filter((product) =>
      [product.name, product.description, product.category]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(normalized)
    );
  }

  function syncQuickSaleSelection(term, sourceList) {
    const filtered = filterProductsSmart(sourceList, term);
    if (filtered.length > 0) {
      setQuickSaleForm((prev) => ({
        ...prev,
        productId: filtered[0].id,
      }));
    }
  }

  function syncComandaSelection(term, sourceList) {
    const filtered = filterProductsSmart(sourceList, term);
    if (filtered.length > 0) {
      setItemLines((prev) =>
        prev.map((line, index) =>
          index === 0 ? { ...line, productId: filtered[0].id } : line
        )
      );
    }
  }

  function printReceipt() {
    const data = receiptModal.data;
    if (!data) return;

    const itemsHtml = mergeItemsByProduct(data.products || [])
      .map(
        (item) => `
        <div style="display:flex;justify-content:space-between;gap:12px;margin:6px 0;">
          <span>${item.quantity}x ${item.name}</span>
          <strong>${currency(Number(item.quantity || 0) * Number(item.price || 0))}</strong>
        </div>
      `
      )
      .join("");

    const fichaHtml =
      data.tokens > 0
        ? `
        <div style="display:flex;justify-content:space-between;gap:12px;margin:6px 0;">
          <span>${data.tokens}x Ficha de sinuca</span>
          <strong>${currency(data.tokens * fichaPrice)}</strong>
        </div>
      `
        : "";

    const receivedHtml =
      data.paymentMethod === "Dinheiro"
        ? `
        <div style="display:flex;justify-content:space-between;margin-top:8px;">
          <span>Recebido</span>
          <strong>${currency(data.amountReceived)}</strong>
        </div>
        <div style="display:flex;justify-content:space-between;margin-top:4px;">
          <span>Troco</span>
          <strong>${currency(data.troco)}</strong>
        </div>
      `
        : "";

    const fiadoSummaryHtml =
      data.fiadoSummary
        ? `
        <div class="line"></div>
        <h2 style="font-size:14px;margin-bottom:8px;">Resumo do fiado</h2>
        <div class="row"><span>Status</span><strong>${data.fiadoSummary.status}</strong></div>
        <div class="row"><span>Pago parcial</span><strong>${currency(data.fiadoSummary.partialPaid)}</strong></div>
        <div class="row"><span>Saldo pendente</span><strong>${currency(data.fiadoSummary.pending)}</strong></div>
      `
        : "";

    const historyHtml =
      data.history?.length
        ? `
        <div class="line"></div>
        <h2 style="font-size:14px;margin-bottom:8px;">Histórico</h2>
        ${data.history
          .map(
            (item) => `
            <div style="border:1px solid #ddd;border-radius:10px;padding:8px 10px;margin:8px 0;">
              <div class="row"><span>${item.type}</span><strong>${currency(item.value)}</strong></div>
              <div class="row"><span>Método</span><span>${item.method || "-"}</span></div>
              <div class="row"><span>Data</span><span>${item.at || "-"}</span></div>
            </div>
          `
          )
          .join("")}
      `
        : "";

    const html = `
      <!DOCTYPE html>
      <html lang="pt-BR">
        <head>
          <meta charset="UTF-8" />
          <title>Cupom não fiscal</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 24px; color: #111; }
            .wrap { max-width: 420px; margin: 0 auto; border: 1px dashed #999; padding: 20px; }
            h1,h2,p { margin: 0; }
            .center { text-align: center; }
            .muted { color: #555; font-size: 12px; }
            .line { border-top: 1px dashed #999; margin: 12px 0; }
            .row { display: flex; justify-content: space-between; gap: 12px; margin: 4px 0; }
            .total { font-size: 18px; font-weight: bold; }
          </style>
        </head>
        <body>
          <div class="wrap">
            <div class="center">
              <h1>Bar do Pereira</h1>
              <p class="muted">Comprovante não fiscal</p>
            </div>
            <div class="line"></div>
            <div class="row"><span>Comanda</span><strong>${data.code}</strong></div>
            <div class="row"><span>Cliente</span><strong>${data.customer}</strong></div>
            <div class="row"><span>Data</span><strong>${data.at}</strong></div>
            <div class="line"></div>
            <h2 style="font-size:14px;margin-bottom:8px;">Itens</h2>
            ${itemsHtml}
            ${fichaHtml}
            <div class="line"></div>
            <div class="row"><span>Pagamento</span><strong>${data.paymentMethod}</strong></div>
            ${receivedHtml}
            ${fiadoSummaryHtml}
            ${historyHtml}
            <div class="line"></div>
            <div class="row total"><span>Total</span><strong>${currency(data.total)}</strong></div>
          </div>
        </body>
      </html>
    `;

    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    printWindow.document.open();
    printWindow.document.write(html);
    printWindow.document.close();
    printWindow.focus();
    printWindow.print();
  }

  async function getCurrentUserId() {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data?.user?.id) return null;
    return data.user.id;
  }

  async function restoreSession() {
    const { data } = await supabase.auth.getSession();
    if (data?.session?.user) {
      setAuth({
        isAuthenticated: true,
        user: {
          id: data.session.user.id,
          name: data.session.user.email || "Administrador",
          role: "admin",
        },
      });
    }
  }

  async function handleLogin() {
    if (!loginForm.user.trim() || !loginForm.password.trim()) {
      notify("Preencha usuário e senha para entrar.", "warn");
      return;
    }

    setLoginLoading(true);

    const email = loginForm.user.trim().includes("@")
      ? loginForm.user.trim()
      : `${loginForm.user.trim()}@bardopereira.local`;

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password: loginForm.password,
    });

    setLoginLoading(false);

    if (error) {
      notify(error.message || "Usuário ou senha inválidos.", "warn");
      return;
    }

    setAuth({
      isAuthenticated: true,
      user: data.user
        ? {
            id: data.user.id,
            name: data.user.email || "Administrador",
            role: "admin",
          }
        : null,
    });

    setLoginForm({ user: "", password: "" });
    notify("Acesso liberado.", "success");
  }

  function logout() {
    openConfirm({
      type: "info",
      title: "Sair do sistema",
      message: "Deseja realmente sair do sistema agora?",
      onConfirm: async () => {
        await supabase.auth.signOut();
        setAuth({ isAuthenticated: false, user: null });
        setActivePage("dashboard");
      },
    });
  }

  async function ensureMesas() {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const { data } = await supabase.from("mesas").select("*").eq("user_id", userId);
    if ((data || []).length === 0) {
      await supabase.from("mesas").insert([
        { name: "Mesa 1", total: 0, paid: 0, pending: 0, open: false, user_id: userId },
        { name: "Mesa 2", total: 0, paid: 0, pending: 0, open: false, user_id: userId },
      ]);
    }
  }

  async function loadProducts() {
    setProductsLoading(true);

    const { data, error } = await supabase
      .from("products")
      .select("*")
      .order("created_at", { ascending: false });

    setProductsLoading(false);

    if (error) {
      notify("Erro ao carregar produtos.", "warn");
      return;
    }

    const loaded = data || [];
    setProducts(loaded);

    const available = loaded.filter((p) => Number(p.stock || 0) > 0);
    const firstProductId = available?.[0]?.id || "";

    setQuickSaleForm((prev) => ({
      ...prev,
      productId: firstProductId || prev.productId || "",
    }));

    setItemLines((prev) =>
      prev.map((line) => ({
        ...line,
        productId: line.productId || firstProductId || "",
      }))
    );
  }

  async function loadPersistedData() {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const [
      comandasRes,
      comandaItemsRes,
      fiadosRes,
      fiadoHistoryRes,
      fiadoItemsRes,
      cashEntriesRes,
      cashEntryItemsRes,
      cash2Res,
      withdrawalsRes,
      loansRes,
      loanHistoryRes,
      mesasRes,
      mesaHistoryRes,
    ] = await Promise.all([
      supabase.from("comandas").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("comanda_items").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("fiados").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("fiado_history").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("fiado_items").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("cash_entries").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("cash_entry_items").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("cash2_entries").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("withdrawals").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("loans").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("loan_history").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
      supabase.from("mesas").select("*").eq("user_id", userId).order("name", { ascending: true }),
      supabase.from("mesa_history").select("*").eq("user_id", userId).order("created_at", { ascending: false }),
    ]);

    const comandasBase = comandasRes.data || [];
    const comandaItems = comandaItemsRes.data || [];

    setComandas(
      comandasBase.map((c) => ({
        id: c.id,
        code: c.code,
        customer: c.customer,
        table: c.table_name,
        status: c.status,
        items: comandaItems
          .filter((i) => i.comanda_id === c.id)
          .map((i) => ({
            id: i.id,
            productId: i.product_id,
            name: i.name,
            quantity: Number(i.quantity || 0),
            price: Number(i.price || 0),
          })),
      }))
    );

    const fiadosBase = fiadosRes.data || [];
    const fiadoHistory = fiadoHistoryRes.data || [];
    const fiadoItems = fiadoItemsRes.data || [];
    const fiadoMesaMap = readFiadoMesaMap();

    setFiados(
      fiadosBase
        .filter((f) => f.status !== "Quitado")
        .map((f) => ({
          id: f.id,
          customer: f.customer,
          pending: Number(f.pending || 0),
          partialPaid: Number(f.partial_paid || 0),
          pendingTokens: Number(f.pending_tokens || 0),
          tableName: f.table_name || fiadoMesaMap[f.id] || "",
          products: fiadoItems
            .filter((i) => i.fiado_id === f.id)
            .map((i) => ({
              id: i.id,
              productId: i.product_id,
              name: i.name,
              quantity: Number(i.quantity || 0),
              price: Number(i.price || 0),
            })),
          history: fiadoHistory
            .filter((h) => h.fiado_id === f.id)
            .map((h) => ({
              type: h.type,
              value: Number(h.value || 0),
              method: h.method,
              at: formatDateTime(h.created_at),
            })),
        }))
    );

    setFiadosQuitados(
      fiadosBase
        .filter((f) => f.status === "Quitado")
        .map((f) => ({
          id: f.id,
          customer: f.customer,
          total: Number(f.partial_paid || 0) + Number(f.pending || 0),
          partialPaid: Number(f.partial_paid || 0),
          pending: Number(f.pending || 0),
          pendingTokens: Number(f.pending_tokens || 0),
          tableName: f.table_name || fiadoMesaMap[f.id] || "",
          at: formatDateTime(f.created_at),
          products: fiadoItems
            .filter((i) => i.fiado_id === f.id)
            .map((i) => ({
              id: i.id,
              productId: i.product_id,
              name: i.name,
              quantity: Number(i.quantity || 0),
              price: Number(i.price || 0),
            })),
          history: fiadoHistory
            .filter((h) => h.fiado_id === f.id)
            .map((h) => ({
              type: h.type,
              value: Number(h.value || 0),
              method: h.method,
              at: formatDateTime(h.created_at),
            })),
        }))
    );

    const cashEntriesBase = cashEntriesRes.data || [];
    const cashItems = cashEntryItemsRes.data || [];

    setCashEntries(
      cashEntriesBase.map((e) => ({
        id: e.id,
        comanda: e.comanda,
        method: e.method,
        total: Number(e.total || 0),
        at: formatDateTime(e.created_at),
        rawDate: new Date(e.created_at).getTime(),
        entryType: e.entry_type,
        items: cashItems
          .filter((i) => i.cash_entry_id === e.id)
          .map((i) => ({
            id: i.id,
            productId: i.product_id,
            name: i.name,
            quantity: Number(i.quantity || 0),
            price: Number(i.price || 0),
          })),
      }))
    );

    setCash2Entries(
      (cash2Res.data || []).map((e) => ({
        id: e.id,
        type: e.type,
        description: e.description,
        value: Number(e.value || 0),
        at: formatDateTime(e.created_at),
        rawDate: new Date(e.created_at).getTime(),
      }))
    );

    setWithdrawals(
      (withdrawalsRes.data || []).map((e) => ({
        id: e.id,
        type: "Retirada",
        value: Number(e.value || 0),
        description: e.description,
        at: formatDateTime(e.created_at),
        rawDate: new Date(e.created_at).getTime(),
      }))
    );

    const loansBase = loansRes.data || [];
    const loanHistory = loanHistoryRes.data || [];

    setLoans(
      loansBase.map((l) => ({
        id: l.id,
        customer: l.customer,
        originalValue: Number(l.original_value || 0),
        pending: Number(l.pending || 0),
        paid: Number(l.paid || 0),
        status: l.status,
        at: formatDateTime(l.created_at),
        rawDate: new Date(l.created_at).getTime(),
        history: loanHistory
          .filter((h) => h.loan_id === l.id)
          .map((h) => ({
            type: h.type,
            value: Number(h.value || 0),
            at: formatDateTime(h.created_at),
          })),
      }))
    );

    const mesas = mesasRes.data || [];
    const mesa1Db = mesas.find((m) => m.name === "Mesa 1");
    const mesa2Db = mesas.find((m) => m.name === "Mesa 2");

    if (mesa1Db) {
      setMesa1({
        total: mesa1Db.total,
        paid: mesa1Db.paid,
        pending: mesa1Db.pending,
        open: mesa1Db.open,
      });
    }

    if (mesa2Db) {
      setMesa2({
        total: mesa2Db.total,
        paid: mesa2Db.paid,
        pending: mesa2Db.pending,
        open: mesa2Db.open,
      });
    }

    setMesaHistory(
      (mesaHistoryRes.data || []).map((e) => ({
        id: e.id,
        mesa: e.mesa,
        action: e.action,
        total: e.total,
        paid: e.paid,
        pending: e.pending,
        tokenQuantity: e.token_quantity,
        value: Number(e.value || 0),
        details: e.details,
        at: formatDateTime(e.created_at),
        rawDate: new Date(e.created_at).getTime(),
      }))
    );
  }

  async function persistMesa(name, nextState) {
    const userId = await getCurrentUserId();
    if (!userId) return;
    await supabase
      .from("mesas")
      .update({
        total: nextState.total,
        paid: nextState.paid,
        pending: nextState.pending,
        open: nextState.open,
        updated_at: new Date().toISOString(),
      })
      .eq("user_id", userId)
      .eq("name", name);
  }

  async function addMesaHistoryEntry({
    mesa,
    action,
    total,
    paid,
    pending,
    tokenQuantity = 0,
    value = 0,
    details = "",
  }) {
    const userId = await getCurrentUserId();
    if (!userId) return;

    const { data, error } = await supabase
      .from("mesa_history")
      .insert({
        mesa,
        action,
        total,
        paid,
        pending,
        token_quantity: tokenQuantity,
        value,
        details,
        user_id: userId,
      })
      .select()
      .single();

    if (!error && data) {
      setMesaHistory((prev) => [
        {
          id: data.id,
          mesa: data.mesa,
          action: data.action,
          total: data.total,
          paid: data.paid,
          pending: data.pending,
          tokenQuantity: data.token_quantity,
          value: Number(data.value || 0),
          details: data.details,
          at: formatDateTime(data.created_at),
          rawDate: new Date(data.created_at).getTime(),
        },
        ...prev,
      ]);
    }
  }

  async function saveCashEntryWithItems({
    comanda,
    method,
    total,
    entryType,
    items,
    description = "",
  }) {
    const userId = await getCurrentUserId();
    const { data, error } = await supabase
      .from("cash_entries")
      .insert({
        comanda,
        method,
        total,
        entry_type: entryType,
        description,
        user_id: userId,
      })
      .select()
      .single();

    if (error) throw error;

    if (items?.length) {
      const payload = items.map((item) => ({
        cash_entry_id: data.id,
        product_id: String(item.productId ?? ""),
        name: item.name,
        quantity: Number(item.quantity || 0),
        price: Number(item.price || 0),
        user_id: userId,
      }));

      const { error: itemsError } = await supabase.from("cash_entry_items").insert(payload);
      if (itemsError) throw itemsError;
    }

    return data;
  }

  async function saveFiadoWithItems({
    customer,
    pending,
    pendingTokens = 0,
    tableName = "",
    products = [],
  }) {
    const userId = await getCurrentUserId();
    const cleanedCustomer = cleanCustomerName(customer);
    const normalizedCustomer = normalizeCustomerName(cleanedCustomer);
    const normalizedPendingTokens = Math.max(0, Number(pendingTokens || 0));
    const normalizedPending = Math.max(0, Number(pending || 0));
    const normalizedTableName =
      normalizedPendingTokens > 0 && ["Mesa 1", "Mesa 2"].includes(tableName) ? tableName : null;

    if (!cleanedCustomer) {
      throw new Error("Informe o nome do cliente do fiado.");
    }

    const { data: existingFiados, error: existingFiadosError } = await supabase
      .from("fiados")
      .select("id, customer, pending, partial_paid, pending_tokens, status")
      .eq("user_id", userId)
      .eq("status", "Pendente");

    if (existingFiadosError) throw existingFiadosError;

    const existingFiado = (existingFiados || []).find(
      (item) => normalizeCustomerName(item.customer) === normalizedCustomer
    );

    if (existingFiado) {
      const nextPending = Number(existingFiado.pending || 0) + normalizedPending;
      const nextPendingTokens = Number(existingFiado.pending_tokens || 0) + normalizedPendingTokens;

      const { error: updateFiadoError } = await supabase
        .from("fiados")
        .update({
          customer: cleanCustomerName(existingFiado.customer || cleanedCustomer),
          pending: nextPending,
          pending_tokens: nextPendingTokens,
          status: "Pendente",
        })
        .eq("id", existingFiado.id);

      if (updateFiadoError) throw updateFiadoError;

      if (existingFiado.id && normalizedTableName) {
        const currentFiadoMesaMap = readFiadoMesaMap();
        saveFiadoMesaMap({
          ...currentFiadoMesaMap,
          [existingFiado.id]: normalizedTableName,
        });
      }

      const { error: historyError } = await supabase.from("fiado_history").insert({
        fiado_id: existingFiado.id,
        type: "Acréscimo",
        value: normalizedPending,
        method: "Fiado",
        user_id: userId,
      });

      if (historyError) throw historyError;

      const fiadoItemPayload = (products || [])
        .filter((item) => item && Number(item.quantity || 0) > 0)
        .map((item) => {
          const rawProductId = String(item.productId || "").trim();
          const hasRealProductId = rawProductId && !rawProductId.includes("ficha");
          return {
            fiado_id: existingFiado.id,
            product_id: hasRealProductId ? rawProductId : null,
            name: item.name,
            quantity: Number(item.quantity || 0),
            price: Number(item.price || 0),
            user_id: userId,
          };
        });

      if (fiadoItemPayload.length) {
        let fiadoItemsError = null;

        const firstAttempt = await supabase.from("fiado_items").insert(fiadoItemPayload);
        fiadoItemsError = firstAttempt.error || null;

        if (fiadoItemsError) {
          const fallbackPayload = fiadoItemPayload.map(({ product_id, ...rest }) => rest);
          const fallbackAttempt = await supabase.from("fiado_items").insert(fallbackPayload);
          fiadoItemsError = fallbackAttempt.error || null;
        }

        if (fiadoItemsError) throw fiadoItemsError;
      }

      return {
        id: existingFiado.id,
        customer: cleanCustomerName(existingFiado.customer || cleanedCustomer),
      };
    }

    const baseFiadoPayload = {
      customer: cleanedCustomer,
      pending: normalizedPending,
      partial_paid: 0,
      pending_tokens: normalizedPendingTokens,
      status: "Pendente",
      user_id: userId,
    };

    let data = null;
    let error = null;

    const firstInsert = await supabase
      .from("fiados")
      .insert({
        ...baseFiadoPayload,
        table_name: normalizedTableName,
      })
      .select()
      .single();

    data = firstInsert.data || null;
    error = firstInsert.error || null;

    if (error && String(error.message || "").toLowerCase().includes("table_name")) {
      const fallbackInsert = await supabase
        .from("fiados")
        .insert(baseFiadoPayload)
        .select()
        .single();

      data = fallbackInsert.data || null;
      error = fallbackInsert.error || null;
    }

    if (error) throw error;

    if (data?.id && normalizedTableName) {
      const currentFiadoMesaMap = readFiadoMesaMap();
      saveFiadoMesaMap({
        ...currentFiadoMesaMap,
        [data.id]: normalizedTableName,
      });
    }

    const { error: historyError } = await supabase.from("fiado_history").insert({
      fiado_id: data.id,
      type: "Abertura",
      value: normalizedPending,
      method: "Fiado",
      user_id: userId,
    });

    if (historyError) throw historyError;

    const fiadoItemPayload = (products || [])
      .filter((item) => item && Number(item.quantity || 0) > 0)
      .map((item) => {
        const rawProductId = String(item.productId || "").trim();
        const hasRealProductId = rawProductId && !rawProductId.includes("ficha");
        return {
          fiado_id: data.id,
          product_id: hasRealProductId ? rawProductId : null,
          name: item.name,
          quantity: Number(item.quantity || 0),
          price: Number(item.price || 0),
          user_id: userId,
        };
      });

    if (fiadoItemPayload.length) {
      let fiadoItemsError = null;

      const firstAttempt = await supabase.from("fiado_items").insert(fiadoItemPayload);
      fiadoItemsError = firstAttempt.error || null;

      if (fiadoItemsError) {
        const fallbackPayload = fiadoItemPayload.map(({ product_id, ...rest }) => rest);
        const fallbackAttempt = await supabase.from("fiado_items").insert(fallbackPayload);
        fiadoItemsError = fallbackAttempt.error || null;
      }

      if (fiadoItemsError) {
        await supabase.from("fiado_history").delete().eq("fiado_id", data.id);
        await supabase.from("fiados").delete().eq("id", data.id);
        throw fiadoItemsError;
      }
    }

    return data;
  }

  async function updateStockAndSales(productItems) {
    for (const item of productItems) {
      if (!item.productId || String(item.productId).includes("ficha")) continue;

      const product = products.find((p) => String(p.id) === String(item.productId));
      if (!product) continue;

      const consumed = Number(item.quantity || 0);

      const { error } = await supabase
        .from("products")
        .update({
          stock: Math.max(0, Number(product.stock || 0) - consumed),
          sold: Number(product.sold || 0) + consumed,
        })
        .eq("id", product.id);

      if (error) throw error;
    }

    await loadProducts();
  }

  function getReservedQuantityInQuickSale(productId) {
    return quickSaleItems
      .filter((item) => String(item.productId) === String(productId))
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }

  function getReservedQuantityInSelectedComanda(productId) {
    if (!selectedComanda) return 0;

    return (selectedComanda.items || [])
      .filter((item) => String(item.productId) === String(productId))
      .reduce((sum, item) => sum + Number(item.quantity || 0), 0);
  }

  function getAvailableStockForQuickSale(productId) {
    const product = products.find((p) => String(p.id) === String(productId));
    if (!product) return 0;

    const stock = Number(product.stock || 0);
    const reservedInQuickSale = getReservedQuantityInQuickSale(productId);
    const reservedInComanda = getReservedQuantityInSelectedComanda(productId);

    return Math.max(0, stock - reservedInQuickSale - reservedInComanda);
  }

  function getAvailableStockForSelectedComanda(productId) {
    const product = products.find((p) => String(p.id) === String(productId));
    if (!product) return 0;

    const stock = Number(product.stock || 0);
    const reservedInComanda = getReservedQuantityInSelectedComanda(productId);
    const reservedInQuickSale = getReservedQuantityInQuickSale(productId);

    return Math.max(0, stock - reservedInComanda - reservedInQuickSale);
  }

  function addItemLine() {
    const list = availableProducts.filter(
      (product) => getAvailableStockForSelectedComanda(product.id) > 0
    );
    setItemLines((prev) => [...prev, { productId: list[0]?.id || "", quantity: 1 }]);
  }

  function updateItemLine(index, field, value) {
    setItemLines((prev) =>
      prev.map((line, i) => (i === index ? { ...line, [field]: value } : line))
    );
  }

  function removeItemLine(index) {
    setItemLines((prev) => (prev.length === 1 ? prev : prev.filter((_, i) => i !== index)));
  }

  async function createOrUpdateProduct() {
    if (!productForm.name.trim() || !productForm.price) {
      notify("Preencha nome e valor do produto.", "warn");
      return;
    }

    if (editingProductId) {
      const { error } = await supabase
        .from("products")
        .update({
          name: productForm.name.trim(),
          description: productForm.description.trim(),
          price: Number(productForm.price),
          stock: Number(productForm.stock || 0),
          category: productForm.category.trim() || "Geral",
        })
        .eq("id", editingProductId);

      if (error) {
        notify("Erro ao atualizar produto.", "warn");
        return;
      }

      setEditingProductId(null);
      notify("Produto atualizado com sucesso.", "success");
      markMenuChanged(["produtos", "dashboard", "relatorios"]);
    } else {
      const { error } = await supabase.from("products").insert({
        name: productForm.name.trim(),
        description: productForm.description.trim(),
        price: Number(productForm.price),
        stock: Number(productForm.stock || 0),
        category: productForm.category.trim() || "Geral",
        sold: 0,
      });

      if (error) {
        notify("Erro ao cadastrar produto.", "warn");
        return;
      }

      notify("Produto cadastrado com sucesso.", "success");
      markMenuChanged(["produtos", "dashboard", "relatorios"]);
    }

    setProductForm({ name: "", description: "", price: "", stock: "", category: "" });
    await loadProducts();
  }

  function editProduct(product) {
    setEditingProductId(product.id);
    setProductForm({
      name: product.name,
      description: product.description || "",
      price: String(product.price),
      stock: String(product.stock),
      category: product.category || "",
    });
  }

  async function deleteProduct(id) {
    openConfirm({
      type: "warn",
      title: "Remover produto",
      message: "Você está removendo um produto cadastrado.",
      onConfirm: async () => {
        const { error } = await supabase.from("products").delete().eq("id", id);

        if (error) {
          notify("Erro ao remover produto.", "warn");
          return;
        }

        notify("Produto removido com sucesso.", "success");
        markMenuChanged(["produtos", "dashboard", "relatorios"]);
        await loadProducts();
      },
    });
  }

  async function createComanda() {
    const name = newComanda.customer.trim();

    if (!name) {
      notify("Digite um nome ou número para criar a comanda.", "warn");
      return;
    }

    const normalized = name.toLowerCase();
    const duplicate = comandas.find(
      (c) =>
        c.customer.trim().toLowerCase() === normalized ||
        String(c.code || "").replace("#", "") === name.replace("#", "")
    );

    if (duplicate) {
      notify(`Já existe uma comanda semelhante: ${duplicate.code} - ${duplicate.customer}.`, "warn");
      return;
    }

    openConfirm({
      type: "info",
      title: "Confirmar abertura de comanda",
      message: `Você vai abrir uma nova comanda para ${name}.`,
      onConfirm: async () => {
        const userId = await getCurrentUserId();
        const code = `#${String(Date.now()).slice(-3)}`;

        const { data, error } = await supabase
          .from("comandas")
          .insert({
            code,
            customer: name,
            table_name: "Nenhuma",
            status: "Aberta",
            user_id: userId,
          })
          .select()
          .single();

        if (error) {
          notify("Erro ao criar comanda no banco.", "warn");
          return;
        }

        await loadPersistedData();
        setSelectedComandaId(data.id);
        setNewComanda({ customer: "" });
        notify(`Comanda ${code} criada com sucesso.`, "success");
        markMenuChanged(["comandas", "dashboard"]);
      },
    });
  }

  function deleteSelectedComanda() {
    if (!selectedComanda) {
      notify("Selecione uma comanda para excluir.", "warn");
      return;
    }

    openConfirm({
      type: "warn",
      title: "Excluir comanda",
      message: `Deseja realmente excluir a comanda ${selectedComanda.code} de ${selectedComanda.customer}?`,
      onConfirm: async () => {
        try {
          await deleteComandaAndItems(selectedComanda.id);
        } catch {
          notify("Erro ao excluir comanda.", "warn");
          return;
        }

        await loadPersistedData();
        setSelectedComandaId("");
        setCloseForm(emptyCloseForm);
        notify(`Comanda ${selectedComanda.code} excluída com sucesso.`, "success");
        markMenuChanged(["comandas", "dashboard"]);
      },
    });
  }

  function removeItemFromComanda(itemId) {
    if (!selectedComanda) return;

    openConfirm({
      type: "warn",
      title: "Remover produto da comanda",
      message: "Você está removendo um item lançado nesta comanda.",
      onConfirm: async () => {
        const { error } = await supabase.from("comanda_items").delete().eq("id", itemId);
        if (error) {
          notify("Erro ao remover item da comanda.", "warn");
          return;
        }

        await loadPersistedData();
        notify("Item removido da comanda.", "warn");
        markMenuChanged(["comandas", "dashboard"]);
      },
    });
  }

  function addProductToComanda() {
    if (!selectedComanda) {
      notify("Selecione uma comanda para adicionar produtos.", "warn");
      return;
    }

    const preview = itemLines
      .map((line) => {
        const product = products.find((p) => String(p.id) === String(line.productId));
        return product ? `${Math.max(1, Number(line.quantity) || 1)}x ${product.name}` : "";
      })
      .filter(Boolean)
      .join(" • ");

    openConfirm({
      type: "info",
      title: "Confirmar adição de produtos",
      message: `Você está adicionando na ${selectedComanda.code}: ${preview}.`,
      onConfirm: async () => {
        try {
          const newItems = [];

          for (const line of itemLines) {
            const product = products.find((p) => String(p.id) === String(line.productId));
            const quantity = Math.max(1, Number(line.quantity) || 1);

            if (!product) continue;

            const alreadyInComanda = getReservedQuantityInSelectedComanda(product.id);
            const alreadyInQuickSale = getReservedQuantityInQuickSale(product.id);
            const alreadyInNewItems = newItems
              .filter((item) => String(item.productId) === String(product.id))
              .reduce((sum, item) => sum + Number(item.quantity || 0), 0);

            const stock = Number(product.stock || 0);
            const available = Math.max(
              0,
              stock - alreadyInComanda - alreadyInQuickSale - alreadyInNewItems
            );

            if (available <= 0) {
              notify(`O produto ${product.name} não tem mais estoque disponível para esta comanda.`, "warn");
              return;
            }

            if (quantity > available) {
              notify(`Estoque insuficiente para ${product.name}. Disponível para adicionar: ${available}.`, "warn");
              return;
            }

            newItems.push({
              productId: product.id,
              name: product.name,
              quantity,
              price: Number(product.price),
            });
          }

          const userId = await getCurrentUserId();
          const payload = newItems.map((item) => ({
            comanda_id: selectedComanda.id,
            product_id: item.productId,
            name: item.name,
            quantity: item.quantity,
            price: item.price,
            user_id: userId,
          }));

          const { error } = await supabase.from("comanda_items").insert(payload);
          if (error) {
            notify("Erro ao salvar itens da comanda.", "warn");
            return;
          }

          await loadPersistedData();

          const nextList = availableProducts.filter(
            (product) => getAvailableStockForSelectedComanda(product.id) > 0
          );

          setItemLines([{ productId: nextList[0]?.id || "", quantity: 1 }]);
          notify(`Produtos adicionados na ${selectedComanda.code}.`, "success");
          markMenuChanged(["comandas", "dashboard"]);
        } catch {
          notify("Erro ao adicionar produtos na comanda.", "warn");
        }
      },
    });
  }

  async function transferTableTokensToFiado(tableName, tokenQuantity) {
    if (!tableName || tableName === "Nenhuma" || !tokenQuantity) return;

    if (tableName === "Mesa 1") {
      const next = {
        total: mesa1.total,
        paid: Number(mesa1.paid || 0),
        pending: Math.max(0, Number(mesa1.pending || 0) - tokenQuantity),
        open: Math.max(0, Number(mesa1.pending || 0) - tokenQuantity) > 0,
      };
      setMesa1(next);
      await persistMesa("Mesa 1", next);
      await addMesaHistoryEntry({
        mesa: "Mesa 1",
        action: "Fichas enviadas para fiado",
        total: next.total,
        paid: next.paid,
        pending: next.pending,
        tokenQuantity,
        value: tokenQuantity * fichaPrice,
        details: `${tokenQuantity} ficha(s) movida(s) para fiado pendente.`,
      });
      return;
    }

    if (tableName === "Mesa 2") {
      const next = {
        total: mesa2.total,
        paid: Number(mesa2.paid || 0),
        pending: Math.max(0, Number(mesa2.pending || 0) - tokenQuantity),
        open: Math.max(0, Number(mesa2.pending || 0) - tokenQuantity) > 0,
      };
      setMesa2(next);
      await persistMesa("Mesa 2", next);
      await addMesaHistoryEntry({
        mesa: "Mesa 2",
        action: "Fichas enviadas para fiado",
        total: next.total,
        paid: next.paid,
        pending: next.pending,
        tokenQuantity,
        value: tokenQuantity * fichaPrice,
        details: `${tokenQuantity} ficha(s) movida(s) para fiado pendente.`,
      });
      return;
    }
  }

  async function applyFiadoTokensToMesa(tableName, tokenQuantity) {
    if (!tableName || tableName === "Nenhuma" || !tokenQuantity) return;

    if (tableName === "Mesa 1") {
      const next = {
        total: mesa1.total,
        paid: Number(mesa1.paid || 0) + tokenQuantity,
        pending: Number(mesa1.pending || 0),
        open: Number(mesa1.pending || 0) > 0,
      };
      setMesa1(next);
      await persistMesa("Mesa 1", next);
      await addMesaHistoryEntry({
        mesa: "Mesa 1",
        action: "Fichas do fiado quitadas",
        total: next.total,
        paid: next.paid,
        pending: next.pending,
        tokenQuantity,
        value: tokenQuantity * fichaPrice,
        details: `${tokenQuantity} ficha(s) do fiado foram pagas.`,
      });
      return;
    }

    if (tableName === "Mesa 2") {
      const next = {
        total: mesa2.total,
        paid: Number(mesa2.paid || 0) + tokenQuantity,
        pending: Number(mesa2.pending || 0),
        open: Number(mesa2.pending || 0) > 0,
      };
      setMesa2(next);
      await persistMesa("Mesa 2", next);
      await addMesaHistoryEntry({
        mesa: "Mesa 2",
        action: "Fichas do fiado quitadas",
        total: next.total,
        paid: next.paid,
        pending: next.pending,
        tokenQuantity,
        value: tokenQuantity * fichaPrice,
        details: `${tokenQuantity} ficha(s) do fiado foram pagas.`,
      });
      return;
    }
  }

  async function applyTablePayment(table, tokenQuantity) {
    if (!tokenQuantity || table === "Nenhuma") return;

    if (table === "Mesa 1") {
      const next = {
        total: mesa1.total,
        paid: Number(mesa1.paid || 0) + tokenQuantity,
        pending: Math.max(0, Number(mesa1.pending || 0) - tokenQuantity),
        open: Math.max(0, Number(mesa1.pending || 0) - tokenQuantity) > 0,
      };
      setMesa1(next);
      await persistMesa("Mesa 1", next);
      await addMesaHistoryEntry({
        mesa: "Mesa 1",
        action: next.pending === 0 ? "Mesa quitada por pagamento" : "Pagamento de fichas",
        total: next.total,
        paid: next.paid,
        pending: next.pending,
        tokenQuantity,
        value: tokenQuantity * fichaPrice,
        details: next.pending === 0 ? `${tokenQuantity} ficha(s) paga(s). Mesa quitada.` : `${tokenQuantity} ficha(s) paga(s).`,
      });
    }

    if (table === "Mesa 2") {
      const next = {
        total: mesa2.total,
        paid: Number(mesa2.paid || 0) + tokenQuantity,
        pending: Math.max(0, Number(mesa2.pending || 0) - tokenQuantity),
        open: Math.max(0, Number(mesa2.pending || 0) - tokenQuantity) > 0,
      };
      setMesa2(next);
      await persistMesa("Mesa 2", next);
      await addMesaHistoryEntry({
        mesa: "Mesa 2",
        action: next.pending === 0 ? "Mesa quitada por pagamento" : "Pagamento de fichas",
        total: next.total,
        paid: next.paid,
        pending: next.pending,
        tokenQuantity,
        value: tokenQuantity * fichaPrice,
        details: next.pending === 0 ? `${tokenQuantity} ficha(s) paga(s). Mesa quitada.` : `${tokenQuantity} ficha(s) paga(s).`,
      });
    }
  }

  function addMesaTokens(tableKey) {
    const qty = Math.max(1, Number(mesaTokenInputs[tableKey] || 1));

    openConfirm({
      type: "info",
      title: "Adicionar fichas na mesa",
      message: `Você vai adicionar ${qty} ficha(s) em ${tableKey === "mesa1" ? "Mesa 1" : "Mesa 2"}.`,
      requirePassword: true,
      onConfirm: async () => {
        const mesaNome = tableKey === "mesa1" ? "Mesa 1" : "Mesa 2";
        const mesaAtual = tableKey === "mesa1" ? mesa1 : mesa2;
        const next = {
          total: Number(mesaAtual.total || 0) + qty,
          paid: Number(mesaAtual.paid || 0),
          pending: Number(mesaAtual.pending || 0) + qty,
          open: true,
        };

        if (tableKey === "mesa1") {
          setMesa1(next);
          await persistMesa("Mesa 1", next);
        } else {
          setMesa2(next);
          await persistMesa("Mesa 2", next);
        }

        await addMesaHistoryEntry({
          mesa: mesaNome,
          action: "Adição de fichas",
          total: next.total,
          paid: next.paid,
          pending: next.pending,
          tokenQuantity: qty,
          value: qty * fichaPrice,
          details: `${qty} ficha(s) adicionada(s).`,
        });

        notify("Fichas adicionadas com sucesso.", "success");
        markMenuChanged(["sinuca", "dashboard"]);
      },
    });
  }

  function closeMesa(table) {
    const state = table === "Mesa 1" ? mesa1 : mesa2;

    if (state.pending > 0) {
      openConfirm({
        type: "warn",
        title: `Fechar ${table} com pendência`,
        message: `${table} possui ${state.pending} ficha(s) pendente(s). Se essas fichas ficaram no fiado, você pode forçar o fechamento da mesa mesmo assim.`,
        requirePassword: true,
        onConfirm: async () => {
          await addMesaHistoryEntry({
            mesa: table,
            action: "Fechamento forçado",
            total: state.total,
            paid: state.paid,
            pending: state.pending,
            tokenQuantity: state.pending,
            value: state.pending * fichaPrice,
            details: "Mesa encerrada com fichas pendentes.",
          });

          const cleared = { total: 0, paid: 0, pending: 0, open: false };

          if (table === "Mesa 1") {
            setMesa1(cleared);
            await persistMesa("Mesa 1", cleared);
          } else {
            setMesa2(cleared);
            await persistMesa("Mesa 2", cleared);
          }

          notify(`${table} foi encerrada com fechamento forçado.`, "warn");
          markMenuChanged(["sinuca", "dashboard"]);
        },
      });
      return;
    }

    openConfirm({
      type: "info",
      title: `Fechar ${table}`,
      message: `${table} será zerada e ficará pronta para novo uso.`,
      requirePassword: true,
      onConfirm: async () => {
        await addMesaHistoryEntry({
          mesa: table,
          action: "Fechamento normal",
          total: state.total,
          paid: state.paid,
          pending: state.pending,
          tokenQuantity: 0,
          value: 0,
          details: "Mesa encerrada sem pendências.",
        });

        const cleared = { total: 0, paid: 0, pending: 0, open: false };

        if (table === "Mesa 1") {
          setMesa1(cleared);
          await persistMesa("Mesa 1", cleared);
        } else {
          setMesa2(cleared);
          await persistMesa("Mesa 2", cleared);
        }

        notify(`${table} zerada com sucesso.`, "success");
        markMenuChanged(["sinuca", "dashboard"]);
      },
    });
  }

  async function addPartialPayment(fiadoId) {
    const value = Number(partialInputs[fiadoId] || 0);

    if (value <= 0) {
      notify("Informe um valor válido para pagamento parcial.", "warn");
      return;
    }

    const fiado = fiados.find((item) => item.id === fiadoId);
    if (!fiado) return;

    const nextPending = Math.max(0, Number(fiado.pending || 0) - value);
    const nextPartialPaid = Number(fiado.partialPaid || 0) + value;
    const nextStatus = nextPending === 0 ? "Quitado" : "Pendente";
    const userId = await getCurrentUserId();

    const { error } = await supabase
      .from("fiados")
      .update({
        pending: nextPending,
        partial_paid: nextPartialPaid,
        status: nextStatus,
      })
      .eq("id", fiadoId);

    if (error) {
      notify("Erro ao registrar pagamento parcial do fiado.", "warn");
      return;
    }

    await supabase.from("fiado_history").insert({
      fiado_id: fiadoId,
      type: "pagamento parcial",
      value,
      method: "Dinheiro",
      user_id: userId,
    });

    await saveCashEntryWithItems({
      comanda: `Fiado - ${fiado.customer}`,
      method: "Pagamento parcial fiado",
      total: value,
      entryType: "sale",
      items: [],
      description: fiado.customer,
    });

    setPartialInputs((prev) => ({ ...prev, [fiadoId]: "" }));
    await loadPersistedData();
    notify("Pagamento parcial registrado.", "success");
    markMenuChanged(["fiados", "dashboard", "caixa"]);
  }

  function settleFiado(fiado) {
    openConfirm({
      type: "info",
      title: "Quitar fiado",
      message: `Você vai quitar totalmente o fiado de ${fiado.customer}.`,
      onConfirm: async () => {
        const pending = Number(fiado.pending || 0);

        const { error } = await supabase
          .from("fiados")
          .update({
            pending: 0,
            partial_paid: Number(fiado.partialPaid || 0) + pending,
            status: "Quitado",
          })
          .eq("id", fiado.id);

        if (error) {
          notify("Erro ao quitar fiado.", "warn");
          return;
        }

        const userId = await getCurrentUserId();
        await supabase.from("fiado_history").insert({
          fiado_id: fiado.id,
          type: "quitação total",
          value: pending,
          method: "Dinheiro",
          user_id: userId,
        });

        if (Number(fiado.pendingTokens || 0) > 0 && fiado.tableName) {
          await applyFiadoTokensToMesa(fiado.tableName, Number(fiado.pendingTokens || 0));
        }

        await saveCashEntryWithItems({
          comanda: `Fiado - ${fiado.customer}`,
          method: "Quitação total",
          total: pending,
          entryType: "sale",
          items: mergeItemsByProduct(fiado.products || []),
          description: fiado.customer,
        });

        await loadPersistedData();
        notify(`Fiado de ${fiado.customer} quitado com sucesso.`, "success");
        markMenuChanged(["fiados", "dashboard", "caixa"]);
      },
    });
  }

  function openCloseCash() {
    openConfirm({
      type: "info",
      title: cashOpen ? "Fechar caixa" : "Abrir caixa",
      message: cashOpen ? "Você está encerrando o caixa atual." : "Você está abrindo um novo caixa.",
      requirePassword: true,
      onConfirm: () => {
        if (cashOpen) {
          const updatedClosedTotal = Number(closedCashLaunchTotal || 0) + Number(totalCashToday || 0);
          setClosedCashLaunchTotal(updatedClosedTotal);
          localStorage.setItem("bar_closed_cash_launch_total", String(updatedClosedTotal));
          setCashOpen(false);
          setCashSessionStart(null);
          localStorage.setItem("bar_cash_open", "false");
          localStorage.removeItem("bar_cash_session_start");
          notify("Caixa fechado.", "success");
        } else {
          const now = Date.now();
          setCashOpen(true);
          setCashSessionStart(now);
          localStorage.setItem("bar_cash_open", "true");
          localStorage.setItem("bar_cash_session_start", String(now));
          notify("Caixa aberto.", "success");
        }
        markMenuChanged(["caixa", "dashboard"]);
      },
    });
  }

  function addQuickSaleItem() {
    const product = products.find(
      (item) => String(item.id) === String(quickSaleForm.productId)
    );

    const quantity = Math.max(1, Number(quickSaleForm.quantity) || 1);

    if (!product) {
      notify("Selecione um produto válido.", "warn");
      return;
    }

    const available = getAvailableStockForQuickSale(product.id);

    if (available <= 0) {
      notify("Esse produto não tem mais estoque disponível para esta venda.", "warn");
      return;
    }

    if (quantity > available) {
      notify(`Estoque insuficiente. Disponível para adicionar: ${available}.`, "warn");
      return;
    }

    setQuickSaleItems((prev) =>
      mergeItemsByProduct([
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: Number(product.price),
          quantity,
        },
      ])
    );

    notify(`${product.name} adicionado à venda.`, "success");
    markMenuChanged(["dashboard", "caixa", "relatorios"]);
  }

  function removeQuickSaleItem(index) {
    setQuickSaleItems((prev) => prev.filter((_, i) => i !== index));
  }

  function quickSaleSubmit() {
    if (quickSaleItems.length === 0) {
      notify("Adicione pelo menos um produto na venda rápida.", "warn");
      return;
    }

    openConfirm({
      type: "info",
      title: "Finalizar venda rápida",
      message: `Você vai concluir uma venda no total de ${currency(quickSaleTotal)}.`,
      onConfirm: async () => {
        try {
          if (quickSale.paymentMethod === "Fiado" && !quickSale.fiadoCustomer.trim()) {
            notify("Informe o nome do cliente fiado na venda rápida.", "warn");
            return;
          }

          await updateStockAndSales(quickSaleItems);

          if (quickSale.paymentMethod === "Fiado") {
            await saveFiadoWithItems({
              customer: quickSale.fiadoCustomer.trim(),
              pending: quickSaleTotal,
              pendingTokens: 0,
              tableName: "",
              products: mergeItemsByProduct(quickSaleItems),
            });
          } else {
            await saveCashEntryWithItems({
              comanda: "Venda rápida",
              method: quickSale.paymentMethod,
              total: quickSaleTotal,
              entryType: "sale",
              items: mergeItemsByProduct(quickSaleItems),
            });
          }

          openReceipt({
            code: "BALCÃO",
            customer: quickSale.paymentMethod === "Fiado" ? quickSale.fiadoCustomer : "Venda sem comanda",
            paymentMethod: quickSale.paymentMethod,
            total: quickSaleTotal,
            amountReceived: quickSale.amountReceived,
            troco: quickSaleTroco,
            products: mergeItemsByProduct(quickSaleItems),
            tokens: 0,
            at: formatDateTime(),
          });

          setQuickSale({ paymentMethod: "Dinheiro", amountReceived: 0, fiadoCustomer: "" });
          setQuickSaleItems([]);

          const nextAvailableQuick = availableProducts.filter(
            (product) => getAvailableStockForQuickSale(product.id) > 0
          );

          setQuickSaleForm({
            productId: nextAvailableQuick[0]?.id || "",
            quantity: 1,
          });

          await loadPersistedData();
          notify("Venda concluída com sucesso.", "success");
          markMenuChanged(["dashboard", "caixa", "fiados", "relatorios"]);
        } catch (error) {
          notify(`Erro ao concluir venda rápida fiado${error?.message ? `: ${error.message}` : "."}`, "warn");
        }
      },
    });
  }

  async function deleteComandaAndItems(comandaId) {
    const { error: itemsError } = await supabase.from("comanda_items").delete().eq("comanda_id", comandaId);
    if (itemsError) throw itemsError;

    const { error: comandaError } = await supabase.from("comandas").delete().eq("id", comandaId);
    if (comandaError) throw comandaError;
  }

  function closeSelectedComanda() {
    if (!selectedComanda) {
      notify("Selecione uma comanda para fechar.", "warn");
      return;
    }

    const total = selectedProductsTotal + validatedTokenQuantity * fichaPrice;

    if (total <= 0) {
      openConfirm({
        type: "info",
        title: "Apagar comanda zerada",
        message: `A ${selectedComanda.code} não possui valores pendentes e será apagada.`,
        onConfirm: async () => {
          try {
            await deleteComandaAndItems(selectedComanda.id);
            await loadPersistedData();
          } catch {
            notify("Erro ao remover comanda.", "warn");
            return;
          }
          setSelectedComandaId("");
          setCloseForm(emptyCloseForm);
          notify(`Comanda ${selectedComanda.code} removida.`, "success");
          markMenuChanged(["comandas", "dashboard"]);
        },
      });
      return;
    }

    if (closeForm.paymentMethod === "Fiado" && !closeForm.fiadoCustomer.trim()) {
      notify("Informe o nome do cliente fiado antes de fechar a comanda.", "warn");
      return;
    }

    if (closeForm.table !== "Nenhuma") {
      if (!selectedTableState || selectedTableState.pending <= 0) {
        setCloseForm((prev) => ({ ...prev, tokenQuantity: 0 }));
        notify("Não existem fichas pendentes nessa mesa.", "warn");
        return;
      }

      if (requestedTokens > selectedTableState.pending) {
        notify(`A quantidade informada é superior às fichas pendentes da ${closeForm.table}.`, "warn");
        return;
      }
    } else if (requestedTokens > 0) {
      setCloseForm((prev) => ({ ...prev, tokenQuantity: 0 }));
    }

    openConfirm({
      type: "info",
      title: "Confirmar fechamento de comanda",
      message: `Total da comanda: ${currency(total)}. Pagamento: ${closeForm.paymentMethod}.`,
      onConfirm: async () => {
        try {
          const productItems = mergeItemsByProduct(selectedComanda.items || []);
          await updateStockAndSales(productItems);

          if (validatedTokenQuantity > 0 && closeForm.paymentMethod !== "Fiado") {
            await applyTablePayment(closeForm.table, validatedTokenQuantity);
          }

          if (closeForm.paymentMethod === "Fiado") {
            const fiadoProducts = mergeItemsByProduct(productItems).filter(
              (item) => item && (item.productId || item.name) && Number(item.quantity || 0) > 0
            );

            await saveFiadoWithItems({
              customer: closeForm.fiadoCustomer.trim(),
              pending: total,
              pendingTokens: validatedTokenQuantity,
              tableName: closeForm.table,
              products: fiadoProducts,
            });

            if (validatedTokenQuantity > 0 && closeForm.table !== "Nenhuma") {
              await transferTableTokensToFiado(closeForm.table, validatedTokenQuantity);
            }
          } else {
            const paymentLabel =
              closeForm.paymentMethod === "Dividir"
                ? `Dividido em ${Math.max(1, Number(closeForm.splitPeople) || 1)} pessoa(s)`
                : closeForm.paymentMethod;

            const itemsForCash = mergeItemsByProduct([
              ...productItems,
              ...(validatedTokenQuantity > 0
                ? [
                    {
                      productId: "ficha-sinuca",
                      name: "Ficha de sinuca",
                      quantity: validatedTokenQuantity,
                      price: fichaPrice,
                    },
                  ]
                : []),
            ]);

            await saveCashEntryWithItems({
              comanda: selectedComanda.code,
              method: paymentLabel,
              total,
              entryType: "sale",
              items: itemsForCash,
              description: selectedComanda.customer,
            });
          }

          openReceipt({
            code: selectedComanda.code,
            customer:
              closeForm.paymentMethod === "Fiado"
                ? closeForm.fiadoCustomer || selectedComanda.customer
                : selectedComanda.customer,
            paymentMethod:
              closeForm.paymentMethod === "Dividir"
                ? `Dividido em ${Math.max(1, Number(closeForm.splitPeople) || 1)} pessoa(s)`
                : closeForm.paymentMethod,
            total,
            amountReceived: closeForm.amountReceived,
            troco,
            products: productItems,
            tokens: validatedTokenQuantity,
            at: formatDateTime(),
          });

          await deleteComandaAndItems(selectedComanda.id);
          await loadPersistedData();

          setCloseForm(emptyCloseForm);
          setSelectedComandaId("");

          notify(`Comanda ${selectedComanda.code} encerrada com sucesso.`, "success");
          markMenuChanged(["dashboard", "caixa", "fiados", "relatorios", "comandas", "sinuca"]);
        } catch (error) {
          notify(`Erro ao fechar comanda${error?.message ? `: ${error.message}` : "."}`, "warn");
        }
      },
    });
  }

  function addCash2Entry() {
    if (!cashOpen) {
      notify("Com o caixa fechado, não é possível editar os caixas.", "warn");
      return;
    }

    const value = Number(cash2Form.value || 0);

    if (value <= 0) {
      notify("Informe um valor válido para lançar no Caixa 2.", "warn");
      return;
    }

    if (cash2Form.type === "Saída" && value > Number(cash2Balance || 0)) {
      notify("Saldo insuficiente no Caixa 2 para essa saída.", "warn");
      return;
    }

    openConfirm({
      type: "info",
      title: "Lançar no Caixa 2",
      message: `Você vai registrar ${cash2Form.type.toLowerCase()} de ${currency(value)} no Caixa 2.`,
      requirePassword: true,
      onConfirm: async () => {
        const userId = await getCurrentUserId();

        const { error } = await supabase.from("cash2_entries").insert({
          type: cash2Form.type,
          description: cash2Form.description.trim() || "Sem descrição",
          value,
          user_id: userId,
        });

        if (error) {
          notify("Erro ao salvar no Caixa 2.", "warn");
          return;
        }

        setCash2Form({ type: "Entrada", description: "", value: "" });
        await loadPersistedData();
        notify("Lançamento registrado no Caixa 2.", "success");
        markMenuChanged(["caixa", "dashboard"]);
      },
    });
  }

  function addWithdrawal() {
    if (!cashOpen) {
      notify("Com o caixa fechado, não é possível lançar retirada.", "warn");
      return;
    }

    const value = Number(withdrawalForm.value || 0);

    if (value <= 0) {
      notify("Informe um valor válido para retirada.", "warn");
      return;
    }

    if (value > Number(availableCashBalance || 0)) {
      notify("Saldo insuficiente no caixa para realizar a retirada.", "warn");
      return;
    }

    openConfirm({
      type: "warn",
      title: "Registrar retirada",
      message: `Você vai registrar uma retirada de ${currency(value)}.`,
      requirePassword: true,
      onConfirm: async () => {
        const userId = await getCurrentUserId();

        const { data: withdrawalDb, error: withdrawalError } = await supabase
          .from("withdrawals")
          .insert({
            value,
            description: withdrawalForm.description.trim() || "Sem descrição",
            user_id: userId,
          })
          .select()
          .single();

        if (withdrawalError) {
          notify("Erro ao salvar retirada.", "warn");
          return;
        }

        await saveCashEntryWithItems({
          comanda: "Retirada",
          method: "Retirada",
          total: -value,
          entryType: "withdrawal",
          items: [
            {
              productId: "retirada",
              name: `Retirada - ${withdrawalDb.description}`,
              quantity: 1,
              price: -value,
            },
          ],
          description: withdrawalDb.description,
        });

        setWithdrawalForm({ value: "", description: "" });
        await loadPersistedData();
        notify("Retirada registrada com sucesso.", "success");
        markMenuChanged(["movimentos", "caixa", "dashboard"]);
      },
    });
  }

  function addLoan() {
    if (!cashOpen) {
      notify("Com o caixa fechado, não é possível lançar empréstimo.", "warn");
      return;
    }

    const value = Number(loanForm.value || 0);
    const cleanedCustomer = cleanCustomerName(loanForm.customer);

    if (!cleanedCustomer) {
      notify("Informe o nome do cliente.", "warn");
      return;
    }

    if (value <= 0) {
      notify("Informe um valor válido para empréstimo.", "warn");
      return;
    }

    if (value > Number(availableCashBalance || 0)) {
      notify("Saldo insuficiente no caixa para realizar o empréstimo.", "warn");
      return;
    }

    openConfirm({
      type: "info",
      title: "Registrar empréstimo",
      message: `Você vai registrar um empréstimo de ${currency(value)} para ${cleanedCustomer}.`,
      requirePassword: true,
      onConfirm: async () => {
        const userId = await getCurrentUserId();
        const normalizedCustomer = normalizeCustomerName(cleanedCustomer);

        const { data: existingLoans, error: existingLoansError } = await supabase
          .from("loans")
          .select("id, customer, original_value, pending, paid, status")
          .eq("user_id", userId)
          .eq("status", "Pendente");

        if (existingLoansError) {
          notify("Erro ao verificar empréstimos existentes.", "warn");
          return;
        }

        const existingLoan = (existingLoans || []).find(
          (item) => normalizeCustomerName(item.customer) === normalizedCustomer
        );

        let loanDb = null;

        if (existingLoan) {
          const { data: updatedLoan, error: loanUpdateError } = await supabase
            .from("loans")
            .update({
              customer: cleanCustomerName(existingLoan.customer || cleanedCustomer),
              original_value: Number(existingLoan.original_value || 0) + value,
              pending: Number(existingLoan.pending || 0) + value,
              status: "Pendente",
            })
            .eq("id", existingLoan.id)
            .select()
            .single();

          if (loanUpdateError) {
            notify("Erro ao atualizar empréstimo.", "warn");
            return;
          }

          loanDb = updatedLoan;

          await supabase.from("loan_history").insert({
            loan_id: loanDb.id,
            type: "Acréscimo empréstimo",
            value,
            user_id: userId,
          });
        } else {
          const { data: createdLoan, error: loanError } = await supabase
            .from("loans")
            .insert({
              customer: cleanedCustomer,
              original_value: value,
              pending: value,
              paid: 0,
              status: "Pendente",
              user_id: userId,
            })
            .select()
            .single();

          if (loanError) {
            notify("Erro ao salvar empréstimo.", "warn");
            return;
          }

          loanDb = createdLoan;

          await supabase.from("loan_history").insert({
            loan_id: loanDb.id,
            type: "Empréstimo",
            value,
            user_id: userId,
          });
        }

        await saveCashEntryWithItems({
          comanda: `Empréstimo - ${loanDb.customer}`,
          method: "Empréstimo",
          total: -value,
          entryType: "loan",
          items: [
            {
              productId: "emprestimo",
              name: `Empréstimo - ${loanDb.customer}`,
              quantity: 1,
              price: -value,
            },
          ],
          description: loanDb.customer,
        });

        setLoanForm({ customer: "", value: "" });
        await loadPersistedData();
        notify(
          existingLoan
            ? "Valor acrescentado ao empréstimo existente do cliente."
            : "Empréstimo registrado com sucesso.",
          "success"
        );
        markMenuChanged(["movimentos", "caixa", "dashboard"]);
      },
    });
  }

  async function addLoanPartialPayment(loanId) {
    const value = Number(loanPartialInputs[loanId] || 0);

    if (value <= 0) {
      notify("Informe um valor válido para pagamento parcial.", "warn");
      return;
    }

    const loan = loans.find((item) => item.id === loanId);
    if (!loan) return;

    const nextPending = Math.max(0, Number(loan.pending || 0) - value);
    const nextPaid = Number(loan.paid || 0) + value;
    const nextStatus = nextPending === 0 ? "Quitado" : "Pendente";
    const userId = await getCurrentUserId();

    const { error: loanUpdateError } = await supabase
      .from("loans")
      .update({
        pending: nextPending,
        paid: nextPaid,
        status: nextStatus,
      })
      .eq("id", loanId);

    if (loanUpdateError) {
      notify("Erro ao atualizar empréstimo.", "warn");
      return;
    }

    await supabase.from("loan_history").insert({
      loan_id: loanId,
      type: "Pagamento parcial",
      value,
      user_id: userId,
    });

    await saveCashEntryWithItems({
      comanda: `Pagamento empréstimo - ${loan.customer}`,
      method: "Pagamento parcial",
      total: value,
      entryType: "loan-payment",
      items: [
        {
          productId: "pagamento-emprestimo-parcial",
          name: `Pagamento parcial - ${loan.customer}`,
          quantity: 1,
          price: value,
        },
      ],
      description: loan.customer,
    });

    setLoanPartialInputs((prev) => ({ ...prev, [loanId]: "" }));
    await loadPersistedData();
    notify("Pagamento parcial do empréstimo registrado.", "success");
    markMenuChanged(["movimentos", "dashboard"]);
  }

  function settleLoan(loan) {
    openConfirm({
      type: "info",
      title: "Quitar empréstimo",
      message: `Quitar totalmente o empréstimo de ${loan.customer}?`,
      requirePassword: true,
      onConfirm: async () => {
        const pending = Number(loan.pending || 0);
        const userId = await getCurrentUserId();

        const { error } = await supabase
          .from("loans")
          .update({
            pending: 0,
            paid: Number(loan.originalValue || 0),
            status: "Quitado",
          })
          .eq("id", loan.id);

        if (error) {
          notify("Erro ao quitar empréstimo.", "warn");
          return;
        }

        await supabase.from("loan_history").insert({
          loan_id: loan.id,
          type: "Quitação total",
          value: pending,
          user_id: userId,
        });

        await saveCashEntryWithItems({
          comanda: `Pagamento empréstimo - ${loan.customer}`,
          method: "Quitação total",
          total: pending,
          entryType: "loan-payment",
          items: [
            {
              productId: "pagamento-emprestimo-total",
              name: `Quitação total - ${loan.customer}`,
              quantity: 1,
              price: pending,
            },
          ],
          description: loan.customer,
        });

        await loadPersistedData();
        notify("Empréstimo quitado com sucesso.", "success");
        markMenuChanged(["movimentos", "dashboard"]);
      },
    });
  }

  function removeCashEntry(entry) {
    openConfirm({
      type: "warn",
      title: "Remover lançamento",
      message: `Deseja remover este lançamento de ${entry.comanda}?`,
      requirePassword: true,
      onConfirm: async () => {
        const { error } = await supabase.from("cash_entries").delete().eq("id", entry.id);
        if (error) {
          notify("Erro ao remover lançamento.", "warn");
          return;
        }

        if (entry.entryType === "withdrawal") {
          await supabase.from("withdrawals").delete().eq("description", entry.description || "");
        }

        await loadPersistedData();
        notify("Lançamento removido com sucesso.", "success");
        markMenuChanged(["caixa", "dashboard"]);
      },
    });
  }

  function downloadCashReport() {
    const lines = filteredCashEntries.map((entry, index) => {
      const itemsText =
        (entry.items || []).length > 0
          ? entry.items.map((item) => `- ${item.quantity}x ${item.name}`).join("\n")
          : "- Sem itens detalhados";

      return [
        `Lançamento ${index + 1}`,
        `Data: ${entry.at}`,
        `Origem: ${entry.comanda}`,
        `Pagamento: ${entry.method}`,
        `Total: ${currency(entry.total)}`,
        `Itens:`,
        `${itemsText}`,
        `----------------------------------------`,
      ].join("\n");
    });

    downloadTextFile(
      "relatorio-caixa-1.txt",
      `${makeReportHeader("Relatório Caixa 1")}${lines.join("\n\n")}`
    );
  }

  function downloadCash2Report() {
    const lines = cash2Entries.map((entry, index) => {
      return [
        `Lançamento ${index + 1}`,
        `Data: ${entry.at}`,
        `Tipo: ${entry.type}`,
        `Descrição: ${entry.description}`,
        `Valor: ${currency(entry.value)}`,
        `----------------------------------------`,
      ].join("\n");
    });

    downloadTextFile(
      "relatorio-caixa-2.txt",
      `${makeReportHeader("Relatório Caixa 2")}Saldo: ${currency(cash2Balance)}\n\n${lines.join("\n\n")}`
    );
  }

  function downloadMesaHistoryReport() {
    const lines = filteredMesaHistory.map((entry, index) => {
      return [
        `Lançamento ${index + 1}`,
        `Data: ${entry.at}`,
        `Mesa: ${entry.mesa}`,
        `Ação: ${entry.action}`,
        `Fichas movimentadas: ${entry.tokenQuantity}`,
        `Valor: ${currency(entry.value)}`,
        `Total da mesa: ${entry.total}`,
        `Fichas pagas: ${entry.paid}`,
        `Fichas pendentes: ${entry.pending}`,
        `Detalhes: ${entry.details}`,
        `----------------------------------------`,
      ].join("\n");
    });

    downloadTextFile(
      "relatorio-mesas-sinuca.txt",
      `${makeReportHeader("Relatório de Mesas de Sinuca")}Filtro: últimos ${mesaFilterDays} dias\n\n${lines.join("\n\n")}`
    );
  }

  useEffect(() => {
    restoreSession();

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        setAuth({
          isAuthenticated: true,
          user: {
            id: session.user.id,
            name: session.user.email || "Administrador",
            role: "admin",
          },
        });
      } else {
        setAuth({ isAuthenticated: false, user: null });
      }
    });

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    const savedOpen = localStorage.getItem("bar_cash_open");
    const savedStart = localStorage.getItem("bar_cash_session_start");

    if (savedOpen === "false") {
      setCashOpen(false);
    } else if (savedOpen === "true") {
      setCashOpen(true);
    }

    if (savedStart) {
      setCashSessionStart(Number(savedStart));
    }
  }, []);

  useEffect(() => {
    if (auth.isAuthenticated) {
      (async () => {
        await ensureMesas();
        await loadProducts();
        await loadPersistedData();
      })();
    }
  }, [auth.isAuthenticated]);

  if (!auth.isAuthenticated) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 p-4">
        <div className="w-full max-w-md rounded-[32px] bg-white p-8 shadow-2xl ring-1 ring-slate-200">
          <div className="mb-8 flex flex-col items-center text-center">
            <div className="flex h-20 w-20 items-center justify-center rounded-3xl bg-amber-400 text-slate-950 shadow-lg">
              <Beer size={36} />
            </div>
            <h1 className="mt-5 text-3xl font-black text-slate-900">Bar do Pereira</h1>
            <p className="mt-2 text-sm text-slate-500">Acesso ao sistema</p>
          </div>

          {toast.text ? (
            <div className={`mb-5 rounded-2xl p-4 ring-1 ${toastStyles[toast.type || "info"]}`}>
              <div className="flex items-start gap-3">
                {toast.type === "success" ? (
                  <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
                ) : toast.type === "warn" ? (
                  <AlertTriangle size={18} className="mt-0.5 shrink-0" />
                ) : (
                  <Info size={18} className="mt-0.5 shrink-0" />
                )}
                <p className="text-sm leading-6">{toast.text}</p>
              </div>
            </div>
          ) : null}

          <div className="grid gap-4">
            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Usuário
              <input
                value={loginForm.user}
                onChange={(e) => setLoginForm((prev) => ({ ...prev, user: e.target.value }))}
                onKeyDown={(e) => handleEnterAction(e, handleLogin)}
                className="rounded-2xl border border-slate-300 bg-white px-4 py-3 outline-none focus:ring-2 focus:ring-amber-300"
                placeholder="Usuário"
              />
            </label>

            <label className="grid gap-2 text-sm font-medium text-slate-700">
              Senha
              <div className="relative">
                <LockKeyhole size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                <input
                  type="password"
                  value={loginForm.password}
                  onChange={(e) => setLoginForm((prev) => ({ ...prev, password: e.target.value }))}
                  onKeyDown={(e) => handleEnterAction(e, handleLogin)}
                  className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-11 pr-4 outline-none focus:ring-2 focus:ring-amber-300"
                  placeholder="Senha"
                />
              </div>
            </label>

            <ActionButton onClick={handleLogin} disabled={loginLoading} variant="dark">
              <span className="inline-flex items-center gap-2">
                <LogIn size={18} />
                {loginLoading ? "Entrando..." : "Entrar"}
              </span>
            </ActionButton>
          </div>
        </div>
      </div>
    );
  }

  const quickSaleSelectableProducts = availableProducts.filter(
    (product) => getAvailableStockForQuickSale(product.id) > 0
  );

  const comandaSelectableProducts = availableProducts.filter(
    (product) => getAvailableStockForSelectedComanda(product.id) > 0
  );

  const quickSaleFilteredProducts = filterProductsSmart(
    quickSaleSelectableProducts,
    quickSaleSearch
  );

  const comandaFilteredProducts = filterProductsSmart(
    comandaSelectableProducts,
    comandaSearch
  );

  return (
    <div className="min-h-screen bg-slate-100 text-slate-900">
      <header className="sticky top-0 z-20 border-b border-slate-200 bg-slate-950 px-4 py-4 text-white shadow-sm">
        <div className="mx-auto max-w-7xl">
          <div className="flex flex-col gap-4">
            <div className="flex items-center justify-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-amber-400 text-slate-950">
                <Beer size={24} />
              </div>
              <h1 className="text-center text-2xl font-black tracking-wide">Bar do Pereira</h1>
            </div>

            <div className="flex justify-center">
              <nav className="flex flex-wrap justify-center gap-2">
                {tabs.map((tab) => (
                  <PageTab
                    key={tab.key}
                    label={tab.label}
                    active={activePage === tab.key}
                    onClick={() => openPage(tab.key)}
                    colorClass={tab.color}
                    hasAlert={menuAlerts[tab.key]}
                    icon={tab.icon}
                  />
                ))}

                <button
                  onClick={logout}
                  className="relative inline-flex items-center gap-2 rounded-2xl bg-rose-500 px-4 py-3 text-sm font-semibold text-white shadow-lg transition-all duration-300 active:scale-[0.97] hover:-translate-y-[1px] hover:bg-rose-400"
                >
                  <LogOut size={16} />
                  <span>Sair</span>
                </button>
              </nav>
            </div>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl p-4 md:p-6 xl:p-8">
        {toast.text ? (
          <div className={`mb-6 rounded-2xl p-4 ring-1 transition-all duration-300 ${toastStyles[toast.type || "info"]}`}>
            <div className="flex items-start gap-3">
              {toast.type === "success" ? (
                <CheckCircle2 size={18} className="mt-0.5 shrink-0" />
              ) : toast.type === "warn" ? (
                <AlertTriangle size={18} className="mt-0.5 shrink-0" />
              ) : (
                <Info size={18} className="mt-0.5 shrink-0" />
              )}
              <p className="text-sm leading-6">{toast.text}</p>
            </div>
          </div>
        ) : null}

        {activePage === "dashboard" && (
          <div className="grid gap-6">
            <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
              <StatCard title="Comandas abertas" value={String(comandas.length)} subtitle={`${currency(totalOpenSales)} em aberto`} icon={ClipboardList} />
              <StatCard title="Produtos cadastrados" value={String(products.length)} subtitle={`${lowStockProducts.length} com estoque baixo`} icon={Package} />
              <StatCard title="Fiado pendente" value={currency(totalFiadoPending)} subtitle={`Quitados: ${currency(totalFiadoPaid)}`} icon={Users} />
              <StatCard title="Caixa do dia" value={currency(totalCashToday)} subtitle={cashOpen ? "Caixa aberto" : "Caixa fechado"} icon={CircleDollarSign} />
            </div>

            <Section title="Venda rápida" subtitle="Venda direta com comprovante opcional.">
              <div className="grid gap-4">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>Buscar produto</span>
                  <input
                    disabled={!cashOpen}
                    value={quickSaleSearch}
                    onChange={(e) => {
                      const value = e.target.value;
                      setQuickSaleSearch(value);
                      syncQuickSaleSelection(value, quickSaleSelectableProducts);
                    }}
                    onKeyDown={(e) => handleEnterAction(e, addQuickSaleItem)}
                    className="rounded-2xl border border-slate-300 bg-white px-3 py-3 outline-none disabled:opacity-50"
                    placeholder="Digite nome, descrição ou categoria"
                  />
                </label>

                <div className="grid gap-3 md:grid-cols-[1fr_140px_auto]">
                  <select
                    disabled={!cashOpen || quickSaleFilteredProducts.length === 0}
                    value={quickSaleForm.productId}
                    onChange={(e) => setQuickSaleForm((prev) => ({ ...prev, productId: e.target.value }))}
                    className="rounded-2xl border border-slate-300 bg-white px-3 py-3 outline-none disabled:opacity-50"
                  >
                    <option value="">Selecione</option>
                    {quickSaleFilteredProducts.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} - {currency(product.price)}
                      </option>
                    ))}
                  </select>

                  <input
                    disabled={!cashOpen}
                    type="number"
                    min={1}
                    value={quickSaleForm.quantity}
                    onChange={(e) => setQuickSaleForm((prev) => ({ ...prev, quantity: e.target.value }))}
                    onKeyDown={(e) => handleEnterAction(e, addQuickSaleItem)}
                    className="rounded-2xl border border-slate-300 bg-white px-3 py-3 outline-none disabled:opacity-50"
                  />

                  <ActionButton disabled={!cashOpen || quickSaleSelectableProducts.length === 0} onClick={addQuickSaleItem} variant="light">
                    Adicionar
                  </ActionButton>
                </div>

                <div className="space-y-2">
                  {quickSaleItems.length === 0 ? (
                    <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-200">
                      Nenhum item adicionado.
                    </div>
                  ) : (
                    quickSaleItems.map((item, index) => (
                      <div key={`${item.productId}-${index}`} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200">
                        <div className="min-w-0">
                          <p className="font-semibold">{item.name}</p>
                          <p className="text-sm text-slate-500">
                            {item.quantity} x {currency(item.price)}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <strong>{currency(Number(item.quantity) * Number(item.price))}</strong>
                          <button
                            disabled={!cashOpen}
                            onClick={() => removeQuickSaleItem(index)}
                            className="rounded-xl bg-rose-50 p-2 text-rose-600 ring-1 ring-rose-200 disabled:opacity-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      </div>
                    ))
                  )}
                </div>

                <div className="grid gap-4 md:grid-cols-4">
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    <span>Pagamento</span>
                    <select
                      disabled={!cashOpen}
                      value={quickSale.paymentMethod}
                      onChange={(e) => setQuickSale((prev) => ({ ...prev, paymentMethod: e.target.value }))}
                      className="rounded-2xl border border-slate-300 bg-white px-3 py-3 outline-none disabled:opacity-50"
                    >
                      <option>Dinheiro</option>
                      <option>Pix</option>
                      <option>Cartão</option>
                      <option>Fiado</option>
                    </select>
                  </label>

                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    <span>Valor recebido</span>
                    <input
                      disabled={!cashOpen}
                      type="number"
                      value={quickSale.amountReceived}
                      onChange={(e) => setQuickSale((prev) => ({ ...prev, amountReceived: e.target.value }))}
                      onKeyDown={(e) => handleEnterAction(e, quickSaleSubmit)}
                      className="rounded-2xl border border-slate-300 bg-white px-3 py-3 outline-none disabled:opacity-50"
                    />
                  </label>

                  <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200 text-emerald-700">
                    <p className="text-sm">Troco</p>
                    <p className="mt-1 text-xl font-black">{currency(quickSaleTroco)}</p>
                  </div>

                  <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <p className="text-sm text-slate-500">Total</p>
                    <p className="mt-1 text-xl font-black">{currency(quickSaleTotal)}</p>
                  </div>
                </div>

                {quickSale.paymentMethod === "Fiado" ? (
                  <label className="grid gap-2 text-sm font-medium text-slate-700">
                    <span>Cliente do fiado</span>
                    <input
                      disabled={!cashOpen}
                      list="fiado-customers-list"
                      value={quickSale.fiadoCustomer}
                      onChange={(e) => setQuickSale((prev) => ({ ...prev, fiadoCustomer: e.target.value }))}
                      onKeyDown={(e) => handleEnterAction(e, quickSaleSubmit)}
                      className="rounded-2xl border border-slate-300 bg-white px-3 py-3 outline-none disabled:opacity-50"
                      placeholder="Nome do cliente"
                    />
                    <datalist id="fiado-customers-list">
                      {fiadoCustomerOptions.map((name) => (
                        <option key={name} value={name} />
                      ))}
                    </datalist>
                    <p className="text-xs text-slate-500">
                      Se o cliente já existir, o novo valor será somado no mesmo fiado com histórico por data.
                    </p>
                  </label>
                ) : null}

                <div>
                  <ActionButton disabled={!cashOpen} onClick={quickSaleSubmit} variant="dark">
                    Finalizar venda
                  </ActionButton>
                </div>
              </div>
            </Section>
          </div>
        )}

        {activePage === "comandas" && (
          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <Section
              title="Nova comanda"
              subtitle="Criação com validação de nome ou número."
              action={
                <ActionButton disabled={!cashOpen} onClick={createComanda} variant="dark">
                  Criar comanda
                </ActionButton>
              }
            >
              <div className="grid gap-4 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>Cliente ou número</span>
                  <input
                    disabled={!cashOpen}
                    value={newComanda.customer}
                    onChange={(e) => setNewComanda({ customer: e.target.value })}
                    onKeyDown={(e) => handleEnterAction(e, createComanda)}
                    className="rounded-2xl border border-slate-300 bg-white px-3 py-3 outline-none disabled:opacity-50"
                    placeholder="Nome ou número da comanda"
                  />
                </label>

                <div className="flex items-center rounded-2xl bg-slate-200 p-4 ring-1 ring-slate-300">
                  <p className="text-sm text-slate-600">Evita campos vazios e duplicação de comandas.</p>
                </div>
              </div>
            </Section>

            <Section title="Comandas abertas" subtitle="Selecione uma comanda para operar.">
              <div className="overflow-x-auto rounded-2xl border border-slate-200">
                <table className="w-full min-w-[560px] text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 text-left">Código</th>
                      <th className="px-4 py-3 text-left">Cliente</th>
                      <th className="px-4 py-3 text-left">Mesa</th>
                      <th className="px-4 py-3 text-left">Status</th>
                      <th className="px-4 py-3 text-left">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comandas.map((comanda) => (
                      <tr
                        key={comanda.id}
                        onClick={() => setSelectedComandaId(comanda.id)}
                        className={`cursor-pointer border-t border-slate-200 ${
                          selectedComanda?.id === comanda.id ? "bg-amber-50" : "bg-white"
                        }`}
                      >
                        <td className="px-4 py-3 font-semibold">{comanda.code}</td>
                        <td className="px-4 py-3">{comanda.customer}</td>
                        <td className="px-4 py-3">{comanda.table}</td>
                        <td className="px-4 py-3">
                          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                            {comanda.status}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-semibold">
                          {currency(
                            (comanda.items || []).reduce(
                              (s, i) => s + Number(i.quantity || 0) * Number(i.price || 0),
                              0
                            )
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section
              title="Produtos na comanda"
              subtitle="Itens agrupados por produto."
              action={
                <ActionButton
                  disabled={!cashOpen}
                  onClick={() => setShowAddProductsPanel((prev) => !prev)}
                  variant="emerald"
                >
                  {showAddProductsPanel ? "Fechar painel" : "Adicionar produto"}
                </ActionButton>
              }
            >
              {showAddProductsPanel ? (
                selectedComanda ? (
                  <>
                    <label className="grid gap-2 text-sm font-medium text-slate-700">
                      <span>Buscar produto</span>
                      <input
                        disabled={!cashOpen}
                        value={comandaSearch}
                        onChange={(e) => {
                          const value = e.target.value;
                          setComandaSearch(value);
                          syncComandaSelection(value, comandaSelectableProducts);
                        }}
                        onKeyDown={(e) => handleEnterAction(e, addProductToComanda)}
                        className="rounded-2xl border border-slate-300 bg-white px-3 py-3 outline-none disabled:opacity-50"
                        placeholder="Digite nome, descrição ou categoria"
                      />
                    </label>

                    <div className="space-y-3">
                      {itemLines.map((line, index) => (
                        <div key={index} className="grid gap-3 md:grid-cols-[1fr_140px_auto]">
                          <select
                            disabled={!cashOpen || comandaFilteredProducts.length === 0}
                            value={line.productId}
                            onChange={(e) => updateItemLine(index, "productId", e.target.value)}
                            className="rounded-2xl border border-slate-300 bg-white px-3 py-3 outline-none disabled:opacity-50"
                          >
                            <option value="">Selecione</option>
                            {comandaFilteredProducts.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name} - {currency(product.price)}
                              </option>
                            ))}
                          </select>

                          <input
                            disabled={!cashOpen}
                            type="number"
                            min={1}
                            value={line.quantity}
                            onChange={(e) => updateItemLine(index, "quantity", e.target.value)}
                            onKeyDown={(e) => handleEnterAction(e, addProductToComanda)}
                            className="rounded-2xl border border-slate-300 bg-white px-3 py-3 outline-none disabled:opacity-50"
                          />

                          <button
                            disabled={!cashOpen}
                            onClick={() => removeItemLine(index)}
                            className="rounded-2xl bg-rose-50 px-4 py-3 text-rose-600 ring-1 ring-rose-200 disabled:opacity-50"
                          >
                            <Trash2 size={16} />
                          </button>
                        </div>
                      ))}
                    </div>

                    <div className="mt-3 flex flex-wrap gap-2">
                      <ActionButton disabled={!cashOpen} onClick={addItemLine} variant="light">
                        Adicionar linha
                      </ActionButton>
                      <ActionButton
                        disabled={!cashOpen || comandaFilteredProducts.length === 0}
                        onClick={addProductToComanda}
                        variant="emerald"
                      >
                        Confirmar produtos
                      </ActionButton>
                    </div>

                    <div className="mt-4 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                      <div className="mb-3 flex items-center justify-between">
                        <p className="font-semibold">Itens da comanda</p>
                        <strong>{currency(selectedProductsTotal)}</strong>
                      </div>

                      <div className="space-y-2">
                        {(selectedComanda.items || []).length === 0 ? (
                          <div className="rounded-2xl bg-white p-4 text-sm text-slate-500 ring-1 ring-slate-200">
                            Nenhum item lançado.
                          </div>
                        ) : (
                          selectedComanda.items.map((item) => (
                            <div
                              key={item.id}
                              className="flex items-center justify-between gap-3 rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200"
                            >
                              <div>
                                <p className="font-semibold">{item.name}</p>
                                <p className="text-sm text-slate-500">
                                  {item.quantity} x {currency(item.price)}
                                </p>
                              </div>
                              <div className="flex items-center gap-3">
                                <strong>
                                  {currency(Number(item.quantity || 0) * Number(item.price || 0))}
                                </strong>
                                <button
                                  disabled={!cashOpen}
                                  onClick={() => removeItemFromComanda(item.id)}
                                  className="rounded-xl bg-rose-50 p-2 text-rose-600 ring-1 ring-rose-200 disabled:opacity-50"
                                >
                                  <Trash2 size={16} />
                                </button>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-200">
                    Crie ou selecione uma comanda.
                  </div>
                )
              ) : (
                <div className="rounded-2xl bg-slate-200 p-4 text-sm text-slate-600 ring-1 ring-slate-300">
                  Clique em <strong>Adicionar produto</strong> para abrir o painel.
                </div>
              )}
            </Section>

            <Section title="Fechamento da comanda" subtitle="Comprovante disponível após o fechamento.">
              <div className="grid gap-4">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>Comandas em aberto</span>
                  <select
                    value={selectedComandaId}
                    onChange={(e) => setSelectedComandaId(e.target.value)}
                    className="rounded-2xl border border-slate-300 bg-white px-3 py-3 outline-none"
                  >
                    <option value="">Selecione uma comanda</option>
                    {comandas.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.code} - {c.customer}
                      </option>
                    ))}
                  </select>
                </label>

                {selectedComanda ? (
                  <>
                    <div className="grid gap-3 sm:grid-cols-3">
                      <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                        <p className="text-sm text-slate-500">Produtos</p>
                        <p className="mt-1 text-xl font-black">{currency(selectedProductsTotal)}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                        <p className="text-sm text-slate-500">Fichas válidas</p>
                        <p className="mt-1 text-xl font-black">{currency(closeTokensValue)}</p>
                      </div>
                      <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                        <p className="text-sm text-slate-500">Total final</p>
                        <p className="mt-1 text-xl font-black">{currency(selectedTotal)}</p>
                      </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        <span>Mesa no pagamento</span>
                        <select
                          disabled={!cashOpen}
                          value={closeForm.table}
                          onChange={(e) =>
                            setCloseForm((prev) => ({
                              ...prev,
                              table: e.target.value,
                              tokenQuantity: 0,
                            }))
                          }
                          className="rounded-2xl border border-slate-300 bg-white px-3 py-3 outline-none disabled:opacity-50"
                        >
                          <option>Nenhuma</option>
                          <option>Mesa 1</option>
                          <option>Mesa 2</option>
                        </select>
                      </label>

                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        <span>Quantidade de fichas</span>
                        <input
                          disabled={!cashOpen || closeForm.table === "Nenhuma" || allowedTokens <= 0}
                          type="number"
                          min={0}
                          max={allowedTokens}
                          value={closeForm.table === "Nenhuma" || allowedTokens <= 0 ? 0 : closeForm.tokenQuantity}
                          onChange={(e) =>
                            setCloseForm((prev) => ({
                              ...prev,
                              tokenQuantity:
                                closeForm.table === "Nenhuma" || allowedTokens <= 0
                                  ? 0
                                  : e.target.value,
                            }))
                          }
                          className="rounded-2xl border border-slate-300 bg-white px-3 py-3 outline-none disabled:opacity-50"
                        />
                      </label>

                      {closeForm.table !== "Nenhuma" ? (
                        <div className="md:col-span-2 rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200 text-sm text-slate-600">
                          Pendentes na mesa escolhida: <strong>{allowedTokens}</strong>.
                        </div>
                      ) : null}

                      <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                        <span>Pagamento</span>
                        <select
                          disabled={!cashOpen}
                          value={closeForm.paymentMethod}
                          onChange={(e) =>
                            setCloseForm((prev) => ({ ...prev, paymentMethod: e.target.value }))
                          }
                          className="rounded-2xl border border-slate-300 bg-white px-3 py-3 outline-none disabled:opacity-50"
                        >
                          <option>Dinheiro</option>
                          <option>Pix</option>
                          <option>Cartão</option>
                          <option>Dividir</option>
                          <option>Fiado</option>
                        </select>
                      </label>
                    </div>

                    {closeForm.paymentMethod === "Dinheiro" ? (
                      <div className="grid gap-4">
                        <label className="grid gap-2 text-sm font-medium text-slate-700">
                          <span>Valor recebido</span>
                          <input
                            disabled={!cashOpen}
                            type="number"
                            value={closeForm.amountReceived}
                            onChange={(e) =>
                              setCloseForm((prev) => ({
                                ...prev,
                                amountReceived: e.target.value,
                              }))
                            }
                            className="rounded-2xl border border-slate-300 bg-white px-3 py-3 outline-none disabled:opacity-50"
                          />
                        </label>

                        <div className="rounded-2xl bg-emerald-50 p-4 text-emerald-700 ring-1 ring-emerald-200">
                          <p className="text-sm">Troco</p>
                          <p className="mt-1 text-2xl font-black">{currency(troco)}</p>
                        </div>
                      </div>
                    ) : null}

                    {closeForm.paymentMethod === "Dividir" ? (
                      <div className="grid gap-4">
                        <label className="grid gap-2 text-sm font-medium text-slate-700">
                          <span>Quantidade de pessoas</span>
                          <input
                            disabled={!cashOpen}
                            type="number"
                            min={2}
                            value={closeForm.splitPeople}
                            onChange={(e) =>
                              setCloseForm((prev) => ({
                                ...prev,
                                splitPeople: e.target.value,
                              }))
                            }
                            className="rounded-2xl border border-slate-300 bg-white px-3 py-3 outline-none disabled:opacity-50"
                          />
                        </label>

                        <div className="rounded-2xl bg-sky-50 p-4 text-sky-700 ring-1 ring-sky-200">
                          <p className="text-sm">Valor por pessoa</p>
                          <p className="mt-1 text-2xl font-black">{currency(splitValue)}</p>
                        </div>
                      </div>
                    ) : null}

                    {closeForm.paymentMethod === "Fiado" ? (
                      <label className="grid gap-2 text-sm font-medium text-slate-700">
                        <span>Nome do cliente fiado</span>
                        <input
                          disabled={!cashOpen}
                          list="fiado-customers-list"
                          value={closeForm.fiadoCustomer}
                          onChange={(e) =>
                            setCloseForm((prev) => ({
                              ...prev,
                              fiadoCustomer: e.target.value,
                            }))
                          }
                          className="rounded-2xl border border-slate-300 bg-white px-3 py-3 outline-none disabled:opacity-50"
                          placeholder="Nome do cliente"
                        />
                        <datalist id="fiado-customers-list">
                          {fiadoCustomerOptions.map((name) => (
                            <option key={name} value={name} />
                          ))}
                        </datalist>
                        <p className="text-xs text-slate-500">
                          Se o cliente já existir, o novo valor será somado no mesmo fiado com histórico por data.
                        </p>
                      </label>
                    ) : null}

                    <div className="flex flex-wrap gap-2">
                      <ActionButton disabled={!cashOpen} onClick={closeSelectedComanda} variant="dark">
                        Encerrar comanda
                      </ActionButton>

                      <ActionButton disabled={!cashOpen} onClick={deleteSelectedComanda} variant="rose">
                        Excluir comanda
                      </ActionButton>
                    </div>
                  </>
                ) : (
                  <div className="rounded-2xl bg-slate-200 p-4 text-sm text-slate-600 ring-1 ring-slate-300">
                    Selecione uma comanda em aberto para continuar.
                  </div>
                )}
              </div>
            </Section>
          </div>
        )}

        {activePage === "produtos" && (
          <div className="grid gap-6 xl:grid-cols-[1fr_1fr]">
            <Section
              title={editingProductId ? "Editar produto" : "Cadastrar produto"}
              subtitle="Cadastro manual com valor, descrição e estoque."
              action={
                <ActionButton disabled={!cashOpen} onClick={createOrUpdateProduct} variant="dark">
                  {editingProductId ? "Salvar edição" : "Salvar produto"}
                </ActionButton>
              }
            >
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-5">
                {[
                  ["name", "Nome", "text"],
                  ["description", "Descrição", "text"],
                  ["price", "Valor", "number"],
                  ["stock", "Estoque", "number"],
                  ["category", "Categoria", "text"],
                ].map(([key, label, type]) => (
                  <label key={key} className="grid gap-2 text-sm font-medium text-slate-700">
                    {label}
                    <input
                      disabled={!cashOpen}
                      type={type}
                      value={productForm[key]}
                      onChange={(e) => setProductForm((prev) => ({ ...prev, [key]: e.target.value }))}
                      onKeyDown={(e) => handleEnterAction(e, createOrUpdateProduct)}
                      className="rounded-2xl border border-slate-300 bg-white px-3 py-3 outline-none disabled:opacity-50"
                      placeholder={label}
                    />
                  </label>
                ))}
              </div>
            </Section>

            <Section
              title="Produtos cadastrados"
              subtitle={productsLoading ? "Carregando..." : "Editar, buscar ou remover produtos cadastrados."}
            >
              <div className="mb-4">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Buscar produto
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      value={productSearch}
                      onChange={(e) => setProductSearch(e.target.value)}
                      className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-10 pr-3 outline-none"
                      placeholder="Pesquisar produto cadastrado"
                    />
                  </div>
                </label>
              </div>

              <div className="grid gap-3 md:grid-cols-2">
                {filteredProducts.map((product) => (
                  <div key={product.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-semibold">{product.name}</p>
                        <p className="text-sm text-slate-500">{product.category}</p>
                      </div>
                      <strong>{currency(product.price)}</strong>
                    </div>

                    <p className="mt-2 text-sm text-slate-600">{product.description}</p>

                    <div className="mt-3 flex items-center justify-between text-sm">
                      <span>Estoque: {product.stock}</span>
                      <span>Saídas: {product.sold}</span>
                    </div>

                    <div className="mt-3 flex gap-2">
                      <ActionButton disabled={!cashOpen} onClick={() => editProduct(product)} variant="light">
                        <span className="inline-flex items-center gap-2">
                          <Pencil size={16} /> Editar
                        </span>
                      </ActionButton>

                      <ActionButton disabled={!cashOpen} onClick={() => deleteProduct(product.id)} variant="rose">
                        <span className="inline-flex items-center gap-2">
                          <Trash2 size={16} /> Remover
                        </span>
                      </ActionButton>
                    </div>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {activePage === "sinuca" && (
          <Section title="Mesas" subtitle="Controle das mesas de jogo.">
            <div className="grid gap-4 md:grid-cols-2">
              {[["Mesa 1", mesa1, "mesa1"], ["Mesa 2", mesa2, "mesa2"]].map(([mesa, state, key]) => {
                const fiadoStats = mesaPendingFiadoStats[key];
                return (
                <div key={mesa} className="min-w-0 overflow-hidden rounded-3xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="truncate text-lg font-bold">{mesa}</h3>
                    {state.pending > 0 ? (
                      <span className="whitespace-nowrap rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-700">
                        {state.pending} pendentes
                      </span>
                    ) : (
                      <span className="whitespace-nowrap rounded-full bg-emerald-100 px-3 py-1 text-xs font-bold text-emerald-700">
                        Quitada
                      </span>
                    )}
                  </div>

                  <div className="mt-4 grid gap-2 text-sm text-slate-600">
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate">Total de fichas</span>
                      <strong>{state.total}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate">Fichas pagas</span>
                      <strong>{state.paid}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate">Fichas pendentes</span>
                      <strong>{state.pending}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate">Fichas fiadas pendentes</span>
                      <strong>{fiadoStats.tokens}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate">Valor pendente na mesa</span>
                      <strong>{currency(state.pending * fichaPrice)}</strong>
                    </div>
                    <div className="flex items-center justify-between gap-3">
                      <span className="truncate">Valor total de fiados pendentes</span>
                      <strong>{currency(fiadoStats.total)}</strong>
                    </div>
                  </div>

                  <div className="mt-4 grid gap-2">
                    <div className="grid grid-cols-[1fr_auto] gap-2">
                      <input
                        disabled={!cashOpen}
                        type="number"
                        min={1}
                        value={mesaTokenInputs[key]}
                        onChange={(e) => setMesaTokenInputs((prev) => ({ ...prev, [key]: e.target.value }))}
                        className="min-w-0 rounded-2xl border border-slate-300 bg-white px-3 py-3 outline-none disabled:opacity-50"
                      />
                      <ActionButton disabled={!cashOpen} onClick={() => addMesaTokens(key)} variant="emerald">
                        <span className="inline-flex items-center gap-2">
                          <Plus size={16} /> fichas
                        </span>
                      </ActionButton>
                    </div>

                    <ActionButton disabled={!cashOpen} onClick={() => closeMesa(mesa)} variant="dark">
                      Fechar mesa
                    </ActionButton>
                  </div>
                </div>
                );
              })}
            </div>

            <div className="mt-6 rounded-3xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <div>
                  <h3 className="text-xl font-bold text-slate-900">Histórico das mesas</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Fechamentos, pagamentos e movimentações de fichas.
                  </p>
                </div>

                <div className="flex flex-wrap gap-2">
                  <select
                    value={mesaFilterDays}
                    onChange={(e) => setMesaFilterDays(e.target.value)}
                    className="rounded-2xl border border-slate-300 bg-white px-3 py-2 outline-none"
                  >
                    <option value="7">7 dias</option>
                    <option value="15">15 dias</option>
                    <option value="30">30 dias</option>
                  </select>

                  <ActionButton onClick={downloadMesaHistoryReport} variant="light">
                    <span className="inline-flex items-center gap-2">
                      <Download size={16} /> Baixar relatório
                    </span>
                  </ActionButton>
                </div>
              </div>

              <div className="max-h-[520px] space-y-2 overflow-y-auto pr-1">
                {filteredMesaHistory.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-200">
                    Nenhum histórico de mesa registrado ainda.
                  </div>
                ) : (
                  filteredMesaHistory.map((entry) => (
                    <div
                      key={entry.id}
                      className="rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200"
                    >
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold text-slate-900">
                            {entry.mesa} • {entry.action}
                          </p>
                          <p className="mt-1 text-sm text-slate-500">{entry.at}</p>
                        </div>
                        <strong>{currency(entry.value)}</strong>
                      </div>

                      <div className="mt-3 grid gap-2 text-sm text-slate-600 md:grid-cols-4">
                        <div>Total de fichas: <strong>{entry.total}</strong></div>
                        <div>Fichas pagas: <strong>{entry.paid}</strong></div>
                        <div>Fichas pendentes: <strong>{entry.pending}</strong></div>
                        <div>Movimentadas: <strong>{entry.tokenQuantity}</strong></div>
                      </div>

                      <p className="mt-2 text-sm text-slate-600">{entry.details}</p>
                    </div>
                  ))
                )}
              </div>
            </div>
          </Section>
        )}

        {activePage === "fiados" && (
          <div className="grid gap-6 xl:grid-cols-2">
            <Section title="Fiados pendentes" subtitle={`Total pendente: ${currency(totalFiadoPending)}`}>
              <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
                {fiados.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-200">
                    Nenhum fiado pendente.
                  </div>
                ) : (
                  fiados.map((fiado) => (
                    <div key={fiado.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                      <div className="flex flex-wrap items-center justify-between gap-3">
                        <div className="min-w-0">
                          <p className="break-words font-semibold">{fiado.customer}</p>
                          <p className="text-sm text-slate-500">
                            Fichas: {fiado.pendingTokens} • Pago parcial: {currency(fiado.partialPaid)}
                          </p>
                        </div>
                        <p className="text-lg font-black text-amber-600">{currency(fiado.pending)}</p>
                      </div>

                      <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
                        <input
                          disabled={!cashOpen}
                          type="number"
                          placeholder="Valor parcial"
                          value={partialInputs[fiado.id] || ""}
                          onChange={(e) => setPartialInputs((prev) => ({ ...prev, [fiado.id]: e.target.value }))}
                          onKeyDown={(e) => handleEnterAction(e, () => addPartialPayment(fiado.id))}
                          className="rounded-2xl border border-slate-300 bg-white px-3 py-3 outline-none disabled:opacity-50"
                        />

                        <ActionButton disabled={!cashOpen} onClick={() => addPartialPayment(fiado.id)} variant="sky">
                          Lançar parcial
                        </ActionButton>

                        <ActionButton disabled={!cashOpen} onClick={() => settleFiado(fiado)} variant="emerald">
                          Quitar tudo
                        </ActionButton>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <ActionButton onClick={() => openReceipt(buildFiadoReceiptData(fiado, "Pendente"))} variant="light">
                          <span className="inline-flex items-center gap-2">
                            <Receipt size={16} /> Comprovante detalhado
                          </span>
                        </ActionButton>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Section>

            <Section title="Fiados quitados" subtitle={`Total quitado: ${currency(totalFiadoPaid)}`}>
              <div className="max-h-[620px] space-y-3 overflow-y-auto pr-1">
                {fiadosQuitados.length === 0 ? (
                  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-200">
                    Nenhum fiado quitado ainda.
                  </div>
                ) : (
                  fiadosQuitados.map((fiado) => (
                    <div key={fiado.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <p className="font-semibold">{fiado.customer}</p>
                          <p className="text-sm text-slate-500">Quitado em {fiado.at}</p>
                        </div>
                        <strong className="text-emerald-700">{currency(fiado.total)}</strong>
                      </div>

                      <div className="mt-3 flex flex-wrap gap-2">
                        <ActionButton onClick={() => openReceipt(buildFiadoReceiptData(fiado, "Quitado"))} variant="light">
                          <span className="inline-flex items-center gap-2">
                            <Receipt size={16} /> Comprovante detalhado
                          </span>
                        </ActionButton>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </Section>
          </div>
        )}

        {activePage === "relatorios" && (
          <Section title="Relatórios" subtitle="Bebidas que mais saem e alertas de estoque baixo.">
            <div className="grid gap-4 lg:grid-cols-2">
              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="mb-3 flex items-center gap-2 text-slate-800">
                  <BarChart3 size={18} />
                  <p className="font-semibold">Bebidas mais vendidas</p>
                </div>
                <div className="space-y-2">
                  {topBeverages.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200 text-sm">
                      <span>{item.name}</span>
                      <strong>{item.sold} saídas</strong>
                    </div>
                  ))}
                </div>
              </div>

              <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                <div className="mb-3 flex items-center gap-2 text-slate-800">
                  <AlertTriangle size={18} />
                  <p className="font-semibold">Estoque baixo</p>
                </div>
                <div className="space-y-2">
                  {lowStockProducts.map((item) => (
                    <div key={item.id} className="flex items-center justify-between rounded-2xl bg-white px-4 py-3 ring-1 ring-slate-200 text-sm">
                      <span>{item.name}</span>
                      <strong>{item.stock} un.</strong>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </Section>
        )}

        {activePage === "caixa" && (
          <div className="grid gap-6 xl:grid-cols-2">
            <Section
              title="Caixa 1"
              subtitle="Abrir e fechar caixa com filtros e relatório."
              action={
                <div className="flex flex-wrap gap-2">
                  <input
                    type="datetime-local"
                    value={reportDateTime}
                    onChange={(e) => setReportDateTime(e.target.value)}
                    className="rounded-2xl border border-slate-300 bg-white px-3 py-2 outline-none"
                  />

                  <ActionButton onClick={downloadCashReport} variant="light">
                    <span className="inline-flex items-center gap-2">
                      <Download size={16} /> Baixar relatório
                    </span>
                  </ActionButton>

                  <ActionButton onClick={openCloseCash} variant={cashOpen ? "rose" : "emerald"}>
                    {cashOpen ? "Fechar caixa" : "Abrir caixa"}
                  </ActionButton>
                </div>
              }
            >
              <div className="space-y-3">
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
                  {cashOpen ? "Caixa aberto" : "Caixa fechado"} • {cashOpen ? "Lançamentos de hoje" : "Lançamentos"}: {currency(totalCashToday)}
                </div>
                <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-600 ring-1 ring-slate-200">
                  Totalização geral de todos os lançamentos: {currency(totalGeneralEntries)}
                </div>
              </div>

              <div className="mt-4 rounded-3xl bg-emerald-50 p-5 ring-1 ring-emerald-200">
                <p className="text-sm text-emerald-800">Disponível no caixa</p>
                <p className="mt-2 text-3xl font-black text-emerald-950">
                  {currency(availableCashBalance)}
                </p>
              </div>

              <div className="mt-4 grid gap-3 md:grid-cols-2">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>Filtrar últimos dias</span>
                  <select
                    value={cashFilterDays}
                    onChange={(e) => setCashFilterDays(e.target.value)}
                    className="rounded-2xl border border-slate-300 bg-white px-3 py-3 outline-none"
                  >
                    <option value="7">7 dias</option>
                    <option value="15">15 dias</option>
                    <option value="30">30 dias</option>
                  </select>
                </label>

                <div className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
                  <p className="text-sm text-slate-500">Base do relatório</p>
                  <p className="mt-1 text-sm font-semibold">
                    {reportDateTime ? formatDateTime(new Date(reportDateTime)) : formatDateTime()}
                  </p>
                </div>
              </div>

              <div className="mt-4 max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                {filteredCashEntries.map((entry) => (
                  <div
                    key={entry.id}
                    onClick={() => removeCashEntry(entry)}
                    className={`flex cursor-pointer items-start justify-between gap-3 rounded-2xl px-4 py-3 ring-1 text-sm ${
                      entry.entryType === "withdrawal"
                        ? "bg-rose-50 ring-rose-200"
                        : entry.entryType === "loan"
                        ? "bg-fuchsia-50 ring-fuchsia-200"
                        : entry.entryType === "loan-payment" && entry.method === "Pagamento parcial"
                        ? "bg-amber-50 ring-amber-200"
                        : entry.entryType === "loan-payment" && entry.method === "Quitação total"
                        ? "bg-emerald-50 ring-emerald-200"
                        : Number(entry.total || 0) > 0
                        ? "bg-emerald-50 ring-emerald-200"
                        : "bg-slate-50 ring-slate-200"
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="break-words">
                        {entry.at} • {entry.comanda} • {entry.method}
                      </p>
                      <p className="mt-1 break-words text-xs text-slate-500">
                        {(entry.items || []).length > 0
                          ? entry.items.map((item) => `${item.quantity}x ${item.name}`).join(" • ")
                          : "Sem itens detalhados"}
                      </p>
                    </div>
                    <strong
                      className={
                        entry.entryType === "withdrawal"
                          ? "text-rose-700"
                          : entry.entryType === "loan"
                          ? "italic text-fuchsia-400"
                          : entry.entryType === "loan-payment" && entry.method === "Pagamento parcial"
                          ? "text-amber-700"
                          : entry.entryType === "loan-payment" && entry.method === "Quitação total"
                          ? "text-emerald-700"
                          : Number(entry.total || 0) > 0
                          ? "text-emerald-700"
                          : "text-slate-900"
                      }
                    >
                      {currency(entry.total)}
                    </strong>
                  </div>
                ))}
              </div>
            </Section>

            <Section
              title="Caixa 2"
              subtitle="Registrar entradas e saídas com saldo automático."
              action={
                <ActionButton onClick={downloadCash2Report} variant="light">
                  <span className="inline-flex items-center gap-2">
                    <Download size={16} /> Baixar relatório
                  </span>
                </ActionButton>
              }
            >
              <div className="grid gap-4 md:grid-cols-3">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>Tipo</span>
                  <select
                    disabled={!cashOpen}
                    value={cash2Form.type}
                    onChange={(e) => setCash2Form((prev) => ({ ...prev, type: e.target.value }))}
                    className="rounded-2xl border border-slate-300 bg-white px-3 py-3 outline-none disabled:opacity-50"
                  >
                    <option>Entrada</option>
                    <option>Saída</option>
                  </select>
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700 md:col-span-2">
                  <span>Descrição</span>
                  <input
                    disabled={!cashOpen}
                    value={cash2Form.description}
                    onChange={(e) => setCash2Form((prev) => ({ ...prev, description: e.target.value }))}
                    className="rounded-2xl border border-slate-300 bg-white px-3 py-3 outline-none disabled:opacity-50"
                    placeholder="Opcional"
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>Valor</span>
                  <input
                    disabled={!cashOpen}
                    type="number"
                    value={cash2Form.value}
                    onChange={(e) => setCash2Form((prev) => ({ ...prev, value: e.target.value }))}
                    className="rounded-2xl border border-slate-300 bg-white px-3 py-3 outline-none disabled:opacity-50"
                  />
                </label>

                <div className="flex items-end">
                  <ActionButton disabled={!cashOpen} onClick={addCash2Entry} variant="violet">
                    Lançar
                  </ActionButton>
                </div>

                <div className="rounded-2xl bg-violet-50 p-4 ring-1 ring-violet-200 text-violet-800">
                  <p className="text-sm">Saldo do Caixa 2</p>
                  <p className="mt-1 text-2xl font-black">{currency(cash2Balance)}</p>
                </div>
              </div>

              <div className="mt-4 max-h-72 space-y-2 overflow-y-auto pr-1">
                {cash2Entries.map((entry) => (
                  <div key={entry.id} className="flex items-center justify-between gap-3 rounded-2xl bg-slate-50 px-4 py-3 ring-1 ring-slate-200 text-sm">
                    <span className="min-w-0 break-words inline-flex items-center gap-2">
                      {entry.type === "Entrada" ? (
                        <ArrowDownCircle size={16} className="text-emerald-600" />
                      ) : (
                        <ArrowUpCircle size={16} className="text-rose-600" />
                      )}
                      {entry.at} • {entry.description}
                    </span>
                    <strong>{currency(entry.value)}</strong>
                  </div>
                ))}
              </div>
            </Section>
          </div>
        )}

        {activePage === "movimentos" && (
          <div className="grid gap-6 xl:grid-cols-2">
            <Section title="Retirada" subtitle="Registrar retirada de caixa.">
              <div className="grid gap-4">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>Valor</span>
                  <input
                    type="number"
                    value={withdrawalForm.value}
                    onChange={(e) => setWithdrawalForm((prev) => ({ ...prev, value: e.target.value }))}
                    onKeyDown={(e) => handleEnterAction(e, addWithdrawal)}
                    className="rounded-2xl border border-slate-300 bg-white px-3 py-3 outline-none"
                  />
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>Descrição</span>
                  <input
                    value={withdrawalForm.description}
                    onChange={(e) =>
                      setWithdrawalForm((prev) => ({ ...prev, description: e.target.value }))
                    }
                    onKeyDown={(e) => handleEnterAction(e, addWithdrawal)}
                    className="rounded-2xl border border-slate-300 bg-white px-3 py-3 outline-none"
                    placeholder="Motivo da retirada"
                  />
                </label>

                <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200 text-sm text-emerald-950">
                  Saldo disponível: <strong>{currency(availableCashBalance)}</strong>
                </div>

                <ActionButton onClick={addWithdrawal} variant="rose">
                  Registrar retirada
                </ActionButton>

                <div className="rounded-2xl bg-white p-4 ring-1 ring-slate-200">
                  <p className="text-sm font-semibold text-slate-700">Histórico de retiradas</p>
                  <div className="mt-3 max-h-72 space-y-2 overflow-y-auto pr-1">
                    {withdrawals.length === 0 ? (
                      <div className="rounded-2xl bg-slate-50 p-3 text-sm text-slate-500 ring-1 ring-slate-200">
                        Nenhuma retirada registrada.
                      </div>
                    ) : (
                      withdrawals.map((entry) => (
                        <div key={entry.id} className="flex items-center justify-between gap-3 rounded-2xl bg-rose-50 px-4 py-3 ring-1 ring-rose-200 text-sm">
                          <div className="min-w-0">
                            <p className="break-words text-rose-700">{entry.at}</p>
                            <p className="mt-1 break-words text-xs text-slate-600">{entry.description || "Sem descrição"}</p>
                          </div>
                          <strong className="text-rose-700">{currency(entry.value)}</strong>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            </Section>

            <Section title="Empréstimo" subtitle="Registrar empréstimo ao cliente.">
              <div className="grid gap-4">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>Cliente</span>
                  <input
                    list="loan-customers-list"
                    value={loanForm.customer}
                    onChange={(e) => setLoanForm((prev) => ({ ...prev, customer: e.target.value }))}
                    onKeyDown={(e) => handleEnterAction(e, addLoan)}
                    className="rounded-2xl border border-slate-300 bg-white px-3 py-3 outline-none"
                  />
                  <datalist id="loan-customers-list">
                    {loanCustomerOptions.map((name) => (
                      <option key={name} value={name} />
                    ))}
                  </datalist>
                  <p className="text-xs text-slate-500">
                    Se o cliente já existir, o novo empréstimo será somado no mesmo cadastro com histórico por data.
                  </p>
                </label>

                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  <span>Valor</span>
                  <input
                    type="number"
                    value={loanForm.value}
                    onChange={(e) => setLoanForm((prev) => ({ ...prev, value: e.target.value }))}
                    onKeyDown={(e) => handleEnterAction(e, addLoan)}
                    className="rounded-2xl border border-slate-300 bg-white px-3 py-3 outline-none"
                  />
                </label>

                <div className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200 text-sm text-emerald-950">
                  Saldo disponível: <strong>{currency(availableCashBalance)}</strong>
                </div>

                <ActionButton onClick={addLoan} variant="fuchsia">
                  Registrar empréstimo
                </ActionButton>
              </div>
            </Section>

            <Section
              title="Empréstimos pendentes e quitados"
              subtitle="Pagamentos parciais e quitação total."
            >
              <div className="max-h-[42rem] space-y-3 overflow-y-auto pr-1">
                {loans.length === 0 ? (
  <div className="rounded-2xl bg-slate-50 p-4 text-sm text-slate-500 ring-1 ring-slate-200">
    Nenhum empréstimo registrado.
  </div>
) : (
  <>
    {loans
      .filter((loan) => loan.status !== "Quitado")
      .map((loan) => (
        <div key={loan.id} className="rounded-2xl bg-slate-50 p-4 ring-1 ring-slate-200">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="font-semibold">{loan.customer}</p>
              <p className="text-sm text-slate-500">
                Status: {loan.status} • Pago: {currency(loan.paid || 0)}
              </p>
            </div>
            <strong className="italic text-fuchsia-400">
              {currency(loan.pending || 0)}
            </strong>
          </div>

          <div className="mt-3 grid gap-3 sm:grid-cols-[1fr_auto_auto]">
            <input
              type="number"
              placeholder="Pagamento parcial"
              value={loanPartialInputs[loan.id] || ""}
              onChange={(e) =>
                setLoanPartialInputs((prev) => ({ ...prev, [loan.id]: e.target.value }))
              }
              className="rounded-2xl border border-slate-300 bg-white px-3 py-3 outline-none"
            />

            <ActionButton onClick={() => addLoanPartialPayment(loan.id)} variant="sky">
              Pagar parcial
            </ActionButton>

            <ActionButton onClick={() => settleLoan(loan)} variant="emerald">
              Quitar total
            </ActionButton>
          </div>

          {loan.history?.length ? (
            <div className="mt-3 max-h-52 space-y-2 overflow-y-auto rounded-2xl bg-white p-3 pr-2 ring-1 ring-slate-200">
              <p className="text-sm font-semibold text-slate-700">Histórico</p>
              {loan.history.map((h, idx) => (
                <div
                  key={idx}
                  className={`flex items-center justify-between text-sm ${
                    h.type === "Pagamento parcial"
                      ? "text-amber-700"
                      : h.type === "Quitação total"
                      ? "text-emerald-700"
                      : "text-slate-600"
                  }`}
                >
                  <span>{h.type}</span>
                  <span>{currency(h.value)} • {h.at}</span>
                </div>
              ))}
            </div>
          ) : null}
        </div>
      ))}

    {loans.some((loan) => loan.status === "Quitado") ? (
  <div className="mt-4">
    <p className="mb-3 text-sm font-bold text-slate-700">Quitados</p>

    <div className="space-y-3">
      {loans
        .filter((loan) => loan.status === "Quitado")
        .map((loan) => (
          <div key={loan.id} className="rounded-2xl bg-emerald-50 p-4 ring-1 ring-emerald-200">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <div>
                <p className="font-semibold">{loan.customer}</p>
                <p className="text-sm text-slate-500">
                  Quitado • Pago: {currency(loan.paid || 0)}
                </p>
              </div>
              <strong className="text-emerald-700">
                {currency(loan.originalValue || 0)}
              </strong>
            </div>

            {loan.history?.length ? (
              <div className="mt-3 max-h-52 space-y-2 overflow-y-auto rounded-2xl bg-white p-3 pr-2 ring-1 ring-slate-200">
                <p className="text-sm font-semibold text-slate-700">Histórico</p>

                {loan.history.map((h, idx) => (
                  <div
                    key={idx}
                    className={`flex items-center justify-between text-sm ${
                      h.type === "Pagamento parcial"
                        ? "text-amber-700"
                        : h.type === "Quitação total"
                        ? "text-emerald-700"
                        : "text-slate-600"
                    }`}
                  >
                    <span>{h.type}</span>
                    <span>
                      {currency(h.value)} • {h.at}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="mt-3 rounded-2xl bg-white p-3 text-sm text-slate-500 ring-1 ring-slate-200">
                Nenhum histórico encontrado.
              </div>
            )}
          </div>
        ))}
    </div>
  </div>
) : null}
  </>
)}
              </div>
            </Section>

            <Section title="Caixa disponível" subtitle="Saldo disponível com destaque.">
              <div className="rounded-3xl bg-amber-50 p-6 ring-1 ring-amber-200">
                <p className="text-sm text-amber-700">Disponível no caixa</p>
                <p className="mt-2 text-4xl font-black text-amber-900">
                  {currency(availableCashBalance)}
                </p>
              </div>
            </Section>
          </div>
        )}

        <footer className="mt-8 rounded-3xl bg-slate-900 px-5 py-4 text-sm text-slate-300">
          <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
            <span>© Bar do Pereira</span>
            <span>Sistema de gestão</span>
          </div>
        </footer>
      </main>

      {receiptModal.open && receiptModal.data ? (
        <div className="fixed inset-0 z-[55] flex items-center justify-center bg-slate-950/60 p-4 print:p-0">
          <div className="w-full max-w-xl rounded-3xl bg-white p-5 shadow-2xl ring-1 ring-slate-200 print:shadow-none print:ring-0">
            <div className="mb-4 flex items-center justify-between gap-3 print:hidden">
              <div>
                <h3 className="text-xl font-bold">Comprovante</h3>
                <p className="text-sm text-slate-500">Imprima caso o cliente queira.</p>
              </div>

              <button onClick={closeReceipt} className="rounded-2xl bg-slate-100 p-2 text-slate-600">
                <Receipt size={18} />
              </button>
            </div>

            <div className="rounded-[28px] bg-slate-950 p-5 text-white">
              <div className="border-b border-dashed border-slate-700 pb-3 text-center">
                <h3 className="text-2xl font-black">Bar do Pereira</h3>
                <p className="mt-1 text-sm text-slate-400">Comprovante não fiscal</p>
              </div>

              <div className="mt-4 space-y-2 text-sm">
                <div className="flex items-center justify-between">
                  <span>Comanda</span>
                  <strong>{receiptModal.data.code}</strong>
                </div>

                <div className="flex items-center justify-between">
                  <span>Cliente</span>
                  <strong>{receiptModal.data.customer}</strong>
                </div>

                <div className="flex items-center justify-between">
                  <span>Data</span>
                  <strong>{receiptModal.data.at}</strong>
                </div>

                <div className="mt-3 rounded-2xl bg-slate-900 p-3">
                  <p className="mb-2 font-semibold">Itens</p>
                  <div className="space-y-2 text-slate-300">
                    {mergeItemsByProduct(receiptModal.data.products).map((item, index) => (
                      <div key={index} className="flex items-center justify-between gap-3">
                        <span>
                          {item.quantity}x {item.name}
                        </span>
                        <strong>{currency(Number(item.quantity || 0) * Number(item.price || 0))}</strong>
                      </div>
                    ))}

                    {receiptModal.data.tokens > 0 ? (
                      <div className="flex items-center justify-between gap-3">
                        <span>{receiptModal.data.tokens}x Ficha de sinuca</span>
                        <strong>{currency(receiptModal.data.tokens * fichaPrice)}</strong>
                      </div>
                    ) : null}
                  </div>
                </div>

                <div className="flex items-center justify-between">
                  <span>Pagamento</span>
                  <strong>{receiptModal.data.paymentMethod}</strong>
                </div>

                {receiptModal.data.paymentMethod === "Dinheiro" ? (
                  <>
                    <div className="flex items-center justify-between">
                      <span>Recebido</span>
                      <strong>{currency(receiptModal.data.amountReceived)}</strong>
                    </div>
                    <div className="flex items-center justify-between">
                      <span>Troco</span>
                      <strong>{currency(receiptModal.data.troco)}</strong>
                    </div>
                  </>
                ) : null}

                {receiptModal.data.fiadoSummary ? (
                  <div className="mt-3 rounded-2xl bg-slate-900 p-3">
                    <p className="mb-2 font-semibold">Resumo do fiado</p>
                    <div className="space-y-2 text-slate-300">
                      <div className="flex items-center justify-between gap-3">
                        <span>Status</span>
                        <strong>{receiptModal.data.fiadoSummary.status}</strong>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Pago parcial</span>
                        <strong>{currency(receiptModal.data.fiadoSummary.partialPaid)}</strong>
                      </div>
                      <div className="flex items-center justify-between gap-3">
                        <span>Saldo pendente</span>
                        <strong>{currency(receiptModal.data.fiadoSummary.pending)}</strong>
                      </div>
                    </div>
                  </div>
                ) : null}

                {receiptModal.data.history?.length ? (
                  <div className="mt-3 rounded-2xl bg-slate-900 p-3">
                    <p className="mb-2 font-semibold">Histórico do fiado</p>
                    <div className="max-h-52 space-y-2 overflow-y-auto pr-1 text-slate-300">
                      {receiptModal.data.history.map((item, index) => (
                        <div key={`${item.type}-${index}`} className="rounded-2xl bg-slate-800 p-3">
                          <div className="flex items-center justify-between gap-3">
                            <span className="font-medium capitalize">{item.type}</span>
                            <strong>{currency(item.value)}</strong>
                          </div>
                          <div className="mt-1 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-400">
                            <span>{item.method || "-"}</span>
                            <span>{item.at || "-"}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}

                <div className="flex items-center justify-between border-t border-dashed border-slate-700 pt-3 text-base">
                  <span>Total</span>
                  <strong className="text-amber-400">{currency(receiptModal.data.total)}</strong>
                </div>
              </div>
            </div>

            <div className="mt-4 flex flex-wrap justify-end gap-2 print:hidden">
              <ActionButton onClick={closeReceipt} variant="light">
                Fechar
              </ActionButton>
              <ActionButton onClick={printReceipt} variant="dark">
                <span className="inline-flex items-center gap-2">
                  <Printer size={16} /> Imprimir
                </span>
              </ActionButton>
            </div>
          </div>
        </div>
      ) : null}

      {confirmModal.open ? (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-950/60 p-4">
          <div className="w-full max-w-lg rounded-3xl bg-white p-5 shadow-2xl ring-1 ring-slate-200">
            <div className={`rounded-2xl p-4 ring-1 ${modalAccent}`}>
              <div className="flex items-start gap-3">
                <ConfirmIcon size={18} className="mt-0.5 shrink-0" />
                <div>
                  <h3 className="font-bold">{confirmModal.title}</h3>
                  <p className="mt-1 text-sm leading-6">{confirmModal.message}</p>
                </div>
              </div>
            </div>

            {confirmModal.requirePassword ? (
              <div className="mt-4">
                <label className="grid gap-2 text-sm font-medium text-slate-700">
                  Senha
                  <div className="relative">
                    <LockKeyhole size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="password"
                      value={confirmModal.password}
                      onChange={(e) => setConfirmModal((prev) => ({ ...prev, password: e.target.value }))}
                      className="w-full rounded-2xl border border-slate-300 bg-white py-3 pl-10 pr-3 outline-none"
                      placeholder="Digite a senha"
                    />
                  </div>
                </label>
              </div>
            ) : null}

            <div className="mt-5 flex flex-wrap justify-end gap-2">
              <ActionButton onClick={closeConfirm} variant="light">
                Cancelar
              </ActionButton>
              <ActionButton onClick={runConfirm} variant="dark">
                Confirmar
              </ActionButton>
            </div>
          </div>
        </div>
      ) : null}

    </div>
  );
}
