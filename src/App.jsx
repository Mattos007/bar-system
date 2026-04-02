import React, { useMemo, useState } from "react";
import {
  AlertTriangle,
  Beer,
  CheckCircle2,
  ClipboardList,
  CreditCard,
  Gamepad2,
  LayoutDashboard,
  Package,
  Receipt,
  Search,
  ShoppingBasket,
  Users,
  Wallet,
  Plus,
} from "lucide-react";

const FICHA_PRICE = 3;

const initialProducts = [
  {
    id: 1,
    name: "Skol 600ml",
    description: "Cerveja garrafa",
    price: 12,
    stock: 48,
    category: "Bebidas",
  },
  {
    id: 2,
    name: "Água 500ml",
    description: "Água mineral sem gás",
    price: 4,
    stock: 30,
    category: "Bebidas",
  },
  {
    id: 3,
    name: "Porção de Batata",
    description: "Porção média crocante",
    price: 28,
    stock: 14,
    category: "Cozinha",
  },
];

const initialComandas = [
  {
    id: 101,
    code: "#101",
    customer: "Rafael",
    table: "Mesa 1",
    status: "Aberta",
    items: [
      { productId: 1, name: "Skol 600ml", quantity: 2, price: 12 },
      { productId: 3, name: "Porção de Batata", quantity: 1, price: 28 },
    ],
  },
  {
    id: 102,
    code: "#102",
    customer: "Balcão",
    table: "Nenhuma",
    status: "Aberta",
    items: [{ productId: 2, name: "Água 500ml", quantity: 2, price: 4 }],
  },
];

const initialFiados = [
  {
    id: 1,
    customer: "João Pereira",
    partialPaid: 20,
    pendingTokens: 3,
    products: [
      { name: "Skol 600ml", quantity: 2, price: 12 },
      { name: "Porção de Batata", quantity: 1, price: 28 },
    ],
  },
];

function formatCurrency(value) {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(value || 0);
}

function calculateComandaTotal(comanda) {
  return comanda.items.reduce((sum, item) => sum + item.quantity * item.price, 0);
}

function fiadoTotal(fiado) {
  const productsTotal = fiado.products.reduce(
    (sum, item) => sum + item.quantity * item.price,
    0
  );
  return productsTotal + fiado.pendingTokens * FICHA_PRICE - fiado.partialPaid;
}

function SidebarItem({ icon: Icon, label, active }) {
  return (
    <button className={`sidebar-item ${active ? "active" : ""}`}>
      <Icon size={18} />
      <span>{label}</span>
    </button>
  );
}

function CardStat({ icon: Icon, title, value, subtitle }) {
  return (
    <div className="card stat-card">
      <div className="stat-top">
        <div>
          <div className="muted small">{title}</div>
          <div className="stat-value">{value}</div>
          <div className="muted">{subtitle}</div>
        </div>
        <div className="stat-icon">
          <Icon size={20} />
        </div>
      </div>
    </div>
  );
}

function Section({ title, subtitle, action, children }) {
  return (
    <section className="card section">
      <div className="section-header">
        <div>
          <h2>{title}</h2>
          {subtitle ? <p className="muted">{subtitle}</p> : null}
        </div>
        {action}
      </div>
      {children}
    </section>
  );
}

export default function App() {
  const [products, setProducts] = useState(initialProducts);
  const [comandas, setComandas] = useState(initialComandas);
  const [fiados] = useState(initialFiados);
  const [selectedComandaId, setSelectedComandaId] = useState(initialComandas[0].id);
  const [selectedProductId, setSelectedProductId] = useState(initialProducts[0].id);
  const [itemQuantity, setItemQuantity] = useState(1);
  const [alertMessage, setAlertMessage] = useState(
    "Ao fechar uma comanda ou mesa, exiba alerta se houver fichas pendentes ou valor enviado para fiado."
  );

  const [closeForm, setCloseForm] = useState({
    paymentMethod: "Dinheiro",
    table: "Mesa 1",
    amountReceived: 100,
    splitPeople: 2,
  });

  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    price: "",
    stock: "",
    category: "",
  });

  const [mesa1, setMesa1] = useState({ tokens: 6, paid: 3, pending: 3 });
  const [mesa2, setMesa2] = useState({ tokens: 2, paid: 2, pending: 0 });

  const selectedComanda = useMemo(() => {
    return comandas.find((item) => item.id === Number(selectedComandaId)) || comandas[0];
  }, [comandas, selectedComandaId]);

  const comandaTotal = useMemo(
    () => calculateComandaTotal(selectedComanda),
    [selectedComanda]
  );

  const splitValue = useMemo(() => {
    const people = Number(closeForm.splitPeople) || 1;
    return comandaTotal / people;
  }, [closeForm.splitPeople, comandaTotal]);

  const troco = useMemo(() => {
    if (closeForm.paymentMethod !== "Dinheiro") return 0;
    return Math.max(0, Number(closeForm.amountReceived || 0) - comandaTotal);
  }, [closeForm.amountReceived, closeForm.paymentMethod, comandaTotal]);

  const totalOpenSales = useMemo(
    () => comandas.reduce((sum, item) => sum + calculateComandaTotal(item), 0),
    [comandas]
  );

  const lowStockCount = useMemo(
    () => products.filter((item) => Number(item.stock) <= 10).length,
    [products]
  );

  function handleAddProductToComanda() {
    if (Number(selectedProductId) === 0) {
      const fichaItem = {
        productId: 0,
        name: "Ficha de Sinuca",
        quantity: Number(itemQuantity),
        price: FICHA_PRICE,
      };

      setComandas((prev) =>
        prev.map((comanda) =>
          comanda.id === Number(selectedComandaId)
            ? { ...comanda, items: [...comanda.items, fichaItem] }
            : comanda
        )
      );

      setAlertMessage(
        `Foram adicionadas ${itemQuantity} ficha(s) na ${selectedComanda.code}. Cada ficha custa ${formatCurrency(
          FICHA_PRICE
        )}.`
      );
      return;
    }

    const product = products.find((item) => item.id === Number(selectedProductId));
    if (!product) return;

    setComandas((prev) =>
      prev.map((comanda) => {
        if (comanda.id !== Number(selectedComandaId)) return comanda;

        const existingItem = comanda.items.find((item) => item.productId === product.id);
        const newItems = existingItem
          ? comanda.items.map((item) =>
              item.productId === product.id
                ? { ...item, quantity: item.quantity + Number(itemQuantity) }
                : item
            )
          : [
              ...comanda.items,
              {
                productId: product.id,
                name: product.name,
                quantity: Number(itemQuantity),
                price: product.price,
              },
            ];

        return { ...comanda, items: newItems };
      })
    );

    setAlertMessage(
      `Produto adicionado na ${selectedComanda.code}. O estoque deve ser baixado quando a venda for confirmada no backend.`
    );
  }

  function handleCreateProduct() {
    if (!newProduct.name || !newProduct.price) return;

    const product = {
      id: Date.now(),
      name: newProduct.name,
      description: newProduct.description,
      price: Number(newProduct.price),
      stock: Number(newProduct.stock || 0),
      category: newProduct.category || "Geral",
    };

    setProducts((prev) => [...prev, product]);
    setNewProduct({
      name: "",
      description: "",
      price: "",
      stock: "",
      category: "",
    });

    setAlertMessage(
      `Produto ${product.name} cadastrado. A ficha segue fixa em ${formatCurrency(
        FICHA_PRICE
      )} e os demais produtos podem ser adicionados manualmente.`
    );
  }

  function addFichaToMesa(mesa) {
    if (mesa === "Mesa 1") {
      setMesa1((prev) => ({ ...prev, tokens: prev.tokens + 1, pending: prev.pending + 1 }));
    } else {
      setMesa2((prev) => ({ ...prev, tokens: prev.tokens + 1, pending: prev.pending + 1 }));
    }

    setAlertMessage(`Nova ficha lançada na ${mesa} por ${formatCurrency(FICHA_PRICE)}.`);
  }

  return (
    <div className="app-shell">
      <aside className="sidebar">
        <div className="brand">
          <div className="brand-icon">
            <Beer size={24} />
          </div>
          <div>
            <h1>Bar do Pereira</h1>
            <p>Painel administrativo</p>
          </div>
        </div>

        <div className="sidebar-group">
          <SidebarItem icon={LayoutDashboard} label="Dashboard" active />
          <SidebarItem icon={ClipboardList} label="Comandas" />
          <SidebarItem icon={Package} label="Produtos" />
          <SidebarItem icon={Gamepad2} label="Sinuca" />
          <SidebarItem icon={Users} label="Fiados" />
          <SidebarItem icon={Wallet} label="Caixa" />
          <SidebarItem icon={Receipt} label="Relatórios" />
        </div>

        <div className="sidebar-highlight">
          <div className="muted small">Valor fixo da ficha</div>
          <div className="price-highlight">{formatCurrency(FICHA_PRICE)}</div>
          <p className="muted">
            A ficha custa sempre 3 reais. Os outros produtos são cadastrados manualmente.
          </p>
        </div>
      </aside>

      <main className="content">
        <header className="topbar">
          <div>
            <h2>Interface pronta para GitHub</h2>
            <p className="muted">
              Projeto base em React + Vite. Dá para subir no repositório e começar o sistema.
            </p>
          </div>

          <div className="search-box">
            <Search size={18} />
            <span>Buscar comanda, produto ou cliente</span>
          </div>
        </header>

        <div className="stats-grid">
          <CardStat
            icon={CreditCard}
            title="Comandas abertas"
            value={String(comandas.length)}
            subtitle={`${formatCurrency(totalOpenSales)} em vendas abertas`}
          />
          <CardStat
            icon={Package}
            title="Produtos cadastrados"
            value={String(products.length)}
            subtitle="Cadastro manual com preço, descrição e estoque"
          />
          <CardStat
            icon={Users}
            title="Fiados pendentes"
            value={formatCurrency(fiados.reduce((sum, item) => sum + fiadoTotal(item), 0))}
            subtitle="Inclui fichas e pagamentos parciais"
          />
          <CardStat
            icon={ShoppingBasket}
            title="Estoque baixo"
            value={String(lowStockCount)}
            subtitle="Itens perto de acabar"
          />
        </div>

        <div className="main-grid">
          <div className="left-column">
            <Section
              title="Comandas abertas"
              subtitle="Acompanhe cliente, mesa e total da comanda"
              action={<button className="primary-btn">Nova comanda</button>}
            >
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Código</th>
                      <th>Cliente</th>
                      <th>Mesa</th>
                      <th>Status</th>
                      <th>Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {comandas.map((comanda) => (
                      <tr key={comanda.id}>
                        <td><strong>{comanda.code}</strong></td>
                        <td>{comanda.customer}</td>
                        <td>{comanda.table}</td>
                        <td>
                          <span className="badge warning">{comanda.status}</span>
                        </td>
                        <td><strong>{formatCurrency(calculateComandaTotal(comanda))}</strong></td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </Section>

            <Section
              title="Adicionar produtos na comanda"
              subtitle="Você pode cadastrar produto novo e depois lançar na comanda"
              action={<button className="success-btn" onClick={handleAddProductToComanda}>Adicionar item</button>}
            >
              <div className="form-grid four">
                <label className="field">
                  <span>Comanda</span>
                  <select
                    value={selectedComandaId}
                    onChange={(e) => setSelectedComandaId(Number(e.target.value))}
                  >
                    {comandas.map((comanda) => (
                      <option key={comanda.id} value={comanda.id}>
                        {comanda.code} - {comanda.customer}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Produto</span>
                  <select
                    value={selectedProductId}
                    onChange={(e) => setSelectedProductId(Number(e.target.value))}
                  >
                    <option value={0}>Ficha de Sinuca - {formatCurrency(FICHA_PRICE)}</option>
                    {products.map((product) => (
                      <option key={product.id} value={product.id}>
                        {product.name} - {formatCurrency(product.price)}
                      </option>
                    ))}
                  </select>
                </label>

                <label className="field">
                  <span>Quantidade</span>
                  <input
                    type="number"
                    min="1"
                    value={itemQuantity}
                    onChange={(e) => setItemQuantity(Number(e.target.value))}
                  />
                </label>

                <div className="mini-card">
                  <div className="muted small">Total atual</div>
                  <div className="mini-card-value">{formatCurrency(comandaTotal)}</div>
                </div>
              </div>

              <div className="items-list">
                {selectedComanda.items.map((item, index) => (
                  <div className="item-row" key={`${item.name}-${index}`}>
                    <div>
                      <div className="item-title">{item.name}</div>
                      <div className="muted">
                        {item.quantity} x {formatCurrency(item.price)}
                      </div>
                    </div>
                    <strong>{formatCurrency(item.quantity * item.price)}</strong>
                  </div>
                ))}
              </div>
            </Section>

            <Section
              title="Cadastro de produtos"
              subtitle="Cadastre manualmente novos produtos com valor, descrição e estoque"
              action={<button className="primary-btn gold" onClick={handleCreateProduct}>Salvar produto</button>}
            >
              <div className="form-grid five">
                <label className="field">
                  <span>Nome</span>
                  <input
                    value={newProduct.name}
                    onChange={(e) => setNewProduct((prev) => ({ ...prev, name: e.target.value }))}
                    placeholder="Ex.: Refrigerante lata"
                  />
                </label>

                <label className="field">
                  <span>Descrição</span>
                  <input
                    value={newProduct.description}
                    onChange={(e) =>
                      setNewProduct((prev) => ({ ...prev, description: e.target.value }))
                    }
                    placeholder="Descrição do produto"
                  />
                </label>

                <label className="field">
                  <span>Valor</span>
                  <input
                    type="number"
                    value={newProduct.price}
                    onChange={(e) => setNewProduct((prev) => ({ ...prev, price: e.target.value }))}
                    placeholder="0,00"
                  />
                </label>

                <label className="field">
                  <span>Estoque</span>
                  <input
                    type="number"
                    value={newProduct.stock}
                    onChange={(e) => setNewProduct((prev) => ({ ...prev, stock: e.target.value }))}
                    placeholder="Quantidade"
                  />
                </label>

                <label className="field">
                  <span>Categoria</span>
                  <input
                    value={newProduct.category}
                    onChange={(e) =>
                      setNewProduct((prev) => ({ ...prev, category: e.target.value }))
                    }
                    placeholder="Bebidas, cozinha..."
                  />
                </label>
              </div>

              <div className="product-grid">
                <div className="mini-card">
                  <div className="muted small">Regra fixa</div>
                  <div className="mini-card-value">{formatCurrency(FICHA_PRICE)}</div>
                  <div className="muted">Ficha de sinuca</div>
                </div>
                <div className="mini-card">
                  <div className="muted small">Cadastro manual</div>
                  <div className="mini-card-value">{products.length}</div>
                  <div className="muted">Produtos cadastrados</div>
                </div>
                <div className="mini-card">
                  <div className="muted small">Personalização</div>
                  <div className="mini-card-value">Livre</div>
                  <div className="muted">Nome, valor e descrição</div>
                </div>
              </div>
            </Section>
          </div>

          <div className="right-column">
            <Section
              title="Fechamento da comanda"
              subtitle="Troco apenas no dinheiro. Em dividir, mostra o valor por pessoa"
            >
              <div className="form-grid two">
                <label className="field">
                  <span>Mesa</span>
                  <select
                    value={closeForm.table}
                    onChange={(e) => setCloseForm((prev) => ({ ...prev, table: e.target.value }))}
                  >
                    <option>Mesa 1</option>
                    <option>Mesa 2</option>
                    <option>Nenhuma</option>
                  </select>
                </label>

                <label className="field">
                  <span>Pagamento</span>
                  <select
                    value={closeForm.paymentMethod}
                    onChange={(e) =>
                      setCloseForm((prev) => ({ ...prev, paymentMethod: e.target.value }))
                    }
                  >
                    <option>Dinheiro</option>
                    <option>Pix</option>
                    <option>Cartão</option>
                    <option>Dividir</option>
                    <option>Fiado</option>
                  </select>
                </label>
              </div>

              <div className="payment-box">
                <div className="payment-row">
                  <span>Total da comanda</span>
                  <strong>{formatCurrency(comandaTotal)}</strong>
                </div>

                {closeForm.paymentMethod === "Dinheiro" ? (
                  <>
                    <label className="field mt">
                      <span>Valor recebido</span>
                      <input
                        type="number"
                        value={closeForm.amountReceived}
                        onChange={(e) =>
                          setCloseForm((prev) => ({ ...prev, amountReceived: e.target.value }))
                        }
                      />
                    </label>

                    <div className="payment-highlight green">
                      <div className="muted small">Troco</div>
                      <div className="payment-value">{formatCurrency(troco)}</div>
                    </div>
                  </>
                ) : null}

                {closeForm.paymentMethod === "Dividir" ? (
                  <>
                    <label className="field mt">
                      <span>Quantidade de pessoas</span>
                      <input
                        type="number"
                        min="2"
                        value={closeForm.splitPeople}
                        onChange={(e) =>
                          setCloseForm((prev) => ({ ...prev, splitPeople: e.target.value }))
                        }
                      />
                    </label>

                    <div className="payment-highlight blue">
                      <div className="muted small">Valor por pessoa</div>
                      <div className="payment-value">{formatCurrency(splitValue)}</div>
                    </div>
                  </>
                ) : null}

                {closeForm.paymentMethod !== "Dinheiro" && closeForm.paymentMethod !== "Dividir" ? (
                  <div className="simple-note">
                    Para {closeForm.paymentMethod.toLowerCase()}, mostre apenas o valor total no fechamento.
                  </div>
                ) : null}
              </div>
            </Section>

            <Section
              title="Sinuca"
              subtitle="Adicionar fichas aleatoriamente, fechar mesa e avisar pendências"
            >
              <div className="mesa-grid">
                {[
                  ["Mesa 1", mesa1],
                  ["Mesa 2", mesa2],
                ].map(([mesa, state]) => (
                  <div className="mesa-card" key={mesa}>
                    <div className="mesa-top">
                      <h3>{mesa}</h3>
                      {state.pending === 0 ? (
                        <span className="badge success">Quitada</span>
                      ) : (
                        <span className="badge info">{state.pending} pendentes</span>
                      )}
                    </div>

                    <div className="mesa-stats">
                      <div className="payment-row">
                        <span>Fichas lançadas</span>
                        <strong>{state.tokens}</strong>
                      </div>
                      <div className="payment-row">
                        <span>Fichas pagas</span>
                        <strong>{state.paid}</strong>
                      </div>
                      <div className="payment-row">
                        <span>Em aberto</span>
                        <strong>{formatCurrency(state.pending * FICHA_PRICE)}</strong>
                      </div>
                    </div>

                    <div className="mesa-actions">
                      <button className="success-btn" onClick={() => addFichaToMesa(mesa)}>
                        <Plus size={16} />
                        Adicionar ficha
                      </button>
                      <button className="primary-btn dark">Fechar mesa</button>
                    </div>
                  </div>
                ))}
              </div>
            </Section>

            <Section
              title="Cupom de fiado"
              subtitle="Precisa mostrar produtos, fichas, pagamentos parciais e valor pendente"
            >
              <div className="receipt-card">
                <div className="receipt-head">
                  <h3>Bar do Pereira</h3>
                  <p>Comprovante de fiado</p>
                </div>

                <div className="receipt-row">
                  <span>Cliente</span>
                  <strong>{fiados[0].customer}</strong>
                </div>

                <div className="receipt-block">
                  <div className="receipt-title">Produtos</div>
                  {fiados[0].products.map((product, index) => (
                    <div className="receipt-row" key={index}>
                      <span>{product.quantity}x {product.name}</span>
                      <strong>{formatCurrency(product.quantity * product.price)}</strong>
                    </div>
                  ))}
                </div>

                <div className="receipt-row">
                  <span>Fichas pendentes</span>
                  <strong>{fiados[0].pendingTokens} x {formatCurrency(FICHA_PRICE)}</strong>
                </div>

                <div className="receipt-row">
                  <span>Pagamentos parciais</span>
                  <strong>{formatCurrency(fiados[0].partialPaid)}</strong>
                </div>

                <div className="receipt-total">
                  <span>Valor pendente</span>
                  <strong>{formatCurrency(fiadoTotal(fiados[0]))}</strong>
                </div>

                <div className="simple-note dark-note">
                  No pagamento total final, descreva novamente os produtos com valores, as fichas, os pagamentos parciais anteriores e o saldo zerado.
                </div>
              </div>
            </Section>

            <Section title="Alertas do sistema" subtitle="Avisos para fechamento de comanda e mesa">
              <div className="alert-box warning-box">
                <AlertTriangle size={18} />
                <span>{alertMessage}</span>
              </div>
              <div className="alert-box success-box">
                <CheckCircle2 size={18} />
                <span>Quando a mesa estiver quitada, ela pode receber novas fichas normalmente.</span>
              </div>
            </Section>
          </div>
        </div>
      </main>
    </div>
  );
}
