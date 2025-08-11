import React, { useEffect, useMemo, useRef, useState } from "react";

/* ========= Real API (ผ่าน Vite proxy) ========= */
const API_BASE = "/api";

type Category = "งาน" | "นัดสำคัญ" | "ซื้อของ" | "ส่วนตัว" | "ไอเดีย/โน้ต";
type Priority = "low" | "medium" | "high";
interface TodoItem {
  id: number;
  todoText: string;
  isDone: boolean;
  createdAt: string;
  updatedAt: string;
  category: Category;
  color?: string | null;
  deadline: string | null;
  priority: Priority;
}

const mockApi = {
  async get(): Promise<TodoItem[]> {
    const res = await fetch(`${API_BASE}/todo`);
    if (!res.ok) throw new Error(`GET /todo failed: ${res.status}`);
    return res.json();
  },

  async post(todo: Omit<TodoItem, "id" | "createdAt" | "updatedAt">): Promise<TodoItem> {
    const res = await fetch(`${API_BASE}/todo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(todo),
    });
    if (!res.ok) throw new Error(`POST /todo failed: ${res.status}`);
    const { data } = await res.json();
    return data as TodoItem;
  },

  async patch(update: { id: number; isDone: boolean }): Promise<TodoItem> {
    const res = await fetch(`${API_BASE}/todo`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(update),
    });
    if (!res.ok) throw new Error(`PATCH /todo failed: ${res.status}`);
    const { data } = await res.json();
    return data as TodoItem;
  },

  async delete(id: number): Promise<void> {
    const res = await fetch(`${API_BASE}/todo`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    if (!res.ok) throw new Error(`DELETE /todo failed: ${res.status}`);
  },
};

/* ========= Colors ========= */
const categoryBaseColor: Record<Category, string> = {
  งาน: "#8B5FBF",
  นัดสำคัญ: "#F472B6",
  ซื้อของ: "#34D399",
  ส่วนตัว: "#60A5FA",
  "ไอเดีย/โน้ต": "#FBBF24",
};
const DEFAULT_HEX = "#6B7280";

/* ========= Color helpers ========= */
function normalizeHex(input?: string | null): string {
  if (!input) return DEFAULT_HEX;
  let hex = input.trim();
  if (hex.startsWith("#")) hex = hex.slice(1);
  if (hex.length === 3) hex = hex.split("").map((c) => c + c).join("");
  if (!/^[0-9A-Fa-f]{6}$/.test(hex)) return DEFAULT_HEX;
  return `#${hex}`;
}
function hexToHsl(hexInput?: string | null) {
  const hex = normalizeHex(hexInput);
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  const max = Math.max(r, g, b), min = Math.min(r, g, b);
  let h = 0, s = 0, l = (max + min) / 2;
  if (max !== min) {
    const d = max - min;
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min);
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break;
      case g: h = (b - r) / d + 2; break;
      case b: h = (r - g) / d + 4; break;
    }
    h /= 6;
  }
  return { h, s, l };
}
function hslToCss({ h, s, l }: { h: number; s: number; l: number }) {
  return `hsl(${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%)`;
}
function colorByPriority(base: string | null | undefined, p: Priority) {
  const hsl = hexToHsl(base);
  const delta = { high: -0.1, medium: 0, low: +0.15 }[p];
  const l = Math.min(0.9, Math.max(0.2, hsl.l + delta));
  return hslToCss({ ...hsl, l });
}

/* ========= Date helpers ========= */
const pad2 = (n: number) => (n < 10 ? `0${n}` : `${n}`);
const toIsoDate = (d: Date) => `${d.getFullYear()}-${pad2(d.getMonth() + 1)}-${pad2(d.getDate())}`;

/* ========= App ========= */
export default function App() {
  const [todos, setTodos] = useState<TodoItem[]>([]);
  const [todoText, setTodoText] = useState("");
  const [category, setCategory] = useState<Category>("งาน");
  const [priority, setPriority] = useState<Priority>("medium");
  const [deadline, setDeadline] = useState<string>("");
  const [loading, setLoading] = useState(false);

  const fetchTodos = async () => {
    try {
      const data = await mockApi.get();
      setTodos(data);
    } catch (error) {
      console.error("Error fetching todos:", error);
      setTodos([]);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, []);

  const progress = useMemo(() => {
    if (todos.length === 0) return 0;
    const done = todos.filter((t) => t.isDone).length;
    return Math.round((done / todos.length) * 100);
  }, [todos]);

  const addTodo = async () => {
    const text = todoText.trim();
    if (!text || loading) return;

    setLoading(true);
    const payload = {
      todoText: text,
      category,
      priority,
      deadline: deadline || null,
      color: categoryBaseColor[category],
      isDone: false,
    };

    try {
      const newTodo = await mockApi.post(payload);
      setTodos((prev) => [newTodo, ...prev]);
      setTodoText("");
      setCategory("งาน");
      setPriority("medium");
      setDeadline("");
    } catch (error) {
      console.error("Error adding todo:", error);
      alert("เพิ่มรายการไม่สำเร็จ");
    } finally {
      setLoading(false);
    }
  };

  const toggleDone = async (todo: TodoItem) => {
    try {
      const updated = await mockApi.patch({ id: todo.id, isDone: !todo.isDone });
      setTodos((prev) => prev.map((t) => (t.id === todo.id ? updated : t)));
    } catch (error) {
      console.error("Error toggling todo:", error);
      alert("อัปเดตสถานะไม่สำเร็จ");
    }
  };

  const deleteTodo = async (id: number) => {
    if (!confirm("ลบรายการนี้ใช่ไหม?")) return;
    try {
      await mockApi.delete(id);
      setTodos((prev) => prev.filter((t) => t.id !== id));
    } catch (error) {
      console.error("Error deleting todo:", error);
      alert("ลบไม่สำเร็จ");
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") addTodo();
  };

  return (
    <div style={{ background: "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)", minHeight: "100vh", color: "#f1f5f9" }}>
      <div style={{ maxWidth: 1200, margin: "0 auto", padding: "28px 20px" }}>
        {/* Header + progress */}
        <div style={{ display: "flex", alignItems: "center", gap: 16, marginBottom: 24 }}>
          <h1 style={{
            fontSize: 44, fontWeight: 900,
            background: "linear-gradient(135deg, #f43f5e 0%, #8b5cf6 100%)",
            WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text", margin: 0
          }}>
            ✨ My Todo App
          </h1>
          <div style={{ flex: 1 }} />
          <div style={{ minWidth: 320 }}>
            <div style={{ fontSize: 12, opacity: 0.7, marginBottom: 6, textAlign: "right" }}>
              {progress}% complete ({todos.filter((t) => t.isDone).length}/{todos.length})
            </div>
            <div style={{ background: "#1e293b", height: 12, borderRadius: 999, overflow: "hidden" }}>
              <div style={{
                width: `${progress}%`, height: "100%",
                background: "linear-gradient(90deg, #8b5cf6 0%, #ec4899 100%)",
                borderRadius: 999, transition: "width 0.6s cubic-bezier(0.4, 0, 0.2, 1)"
              }} />
            </div>
          </div>
        </div>

        {/* Form row */}
        <div style={formRow}>
          <input value={todoText} onChange={(e) => setTodoText(e.target.value)} onKeyPress={handleKeyPress} placeholder="เพิ่มรายการ..." style={inputBase} disabled={loading} />
          <select value={category} onChange={(e) => setCategory(e.target.value as Category)} style={inputBase} disabled={loading}>
            {Object.keys(categoryBaseColor).map((c) => <option key={c} value={c}>{c}</option>)}
          </select>
          <select value={priority} onChange={(e) => setPriority(e.target.value as Priority)} style={inputBase} disabled={loading}>
            <option value="low">ความสำคัญน้อย</option>
            <option value="medium">ความสำคัญปานกลาง</option>
            <option value="high">ความสำคัญมาก</option>
          </select>
          <DateField value={deadline} onChange={setDeadline} disabled={loading} />
          <button onClick={addTodo} style={{ ...addBtn, opacity: loading || !todoText.trim() ? 0.5 : 1, cursor: loading || !todoText.trim() ? "not-allowed" : "pointer" }} disabled={loading || !todoText.trim()}>
            {loading ? "กำลังเพิ่ม..." : "+ เพิ่ม"}
          </button>
        </div>

        {/* Cards */}
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: 20, paddingTop: 20 }}>
          {todos.map((t) => {
            const base = normalizeHex(t.color ?? categoryBaseColor[t.category] ?? DEFAULT_HEX);
            const bg = colorByPriority(base, t.priority);
            const created = new Date(t.createdAt);
            const deadlineDate = t.deadline ? new Date(t.deadline) : null;
            const isOverdue = deadlineDate ? deadlineDate < new Date() && !t.isDone : false;

            return (
              <div key={t.id} style={{
                position: "relative", padding: 24, minHeight: 200, background: bg, borderRadius: 20,
                boxShadow: t.isDone ? "0 8px 25px rgba(16, 185, 129, 0.15)" : "0 10px 30px rgba(0,0,0,0.2)",
                opacity: t.isDone ? 0.8 : 1, border: t.isDone ? "3px solid #10b981" : "3px solid transparent",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)", transform: "translateY(0)", backdropFilter: "blur(10px)"
              }}>
                <div style={{
                  position: "absolute", top: 16, left: 16, background: "rgba(0,0,0,0.15)", backdropFilter: "blur(5px)",
                  padding: "6px 12px", borderRadius: 12, fontSize: 12, fontWeight: 700, color: "#000", border: "1px solid rgba(255,255,255,0.1)"
                }}>
                  {t.category}
                </div>

                <div style={{
                  position: "absolute", top: 16, right: 16,
                  background: t.priority === "high" ? "rgba(239, 68, 68, 0.2)" : t.priority === "medium" ? "rgba(245, 158, 11, 0.2)" : "rgba(34, 197, 94, 0.2)",
                  color: t.priority === "high" ? "#dc2626" : t.priority === "medium" ? "#d97706" : "#059669",
                  padding: "6px 12px", borderRadius: 12, fontWeight: 700, fontSize: 11, border: "1px solid rgba(255,255,255,0.1)"
                }}>
                  {t.priority === "high" ? "🔥 สำคัญมาก" : t.priority === "medium" ? "⚡ สำคัญปานกลาง" : "✨ สำคัญน้อย"}
                </div>

                <div style={{
                  marginTop: 55, fontSize: 17, lineHeight: 1.5, whiteSpace: "pre-wrap",
                  textDecoration: t.isDone ? "line-through 2px" : "none", fontWeight: 600, color: "#000", marginBottom: 24, wordBreak: "break-word"
                }}>
                  {t.todoText}
                </div>

                {deadlineDate && (
                  <div style={{
                    position: "absolute", bottom: 60, left: 24, fontSize: 13, fontWeight: 700,
                    color: isOverdue ? "#dc2626" : "#374151",
                    background: isOverdue ? "rgba(220, 38, 38, 0.15)" : "rgba(0,0,0,0.1)",
                    padding: "6px 12px", borderRadius: 10, border: "1px solid rgba(255,255,255,0.1)"
                  }}>
                    {isOverdue ? "⚠️ เกินกำหนด: " : "📅 กำหนด: "}
                    {deadlineDate.toLocaleDateString("th-TH")}
                  </div>
                )}

                <div style={{ position: "absolute", bottom: 24, left: 24, fontSize: 11, color: "rgba(0,0,0,0.6)" }}>
                  เพิ่มเมื่อ {created.toLocaleDateString("th-TH")}
                </div>

                <div style={{ position: "absolute", bottom: 24, right: 24, display: "flex", gap: 12, alignItems: "center" }}>
                  <label style={{ cursor: "pointer", userSelect: "none", fontSize: 13, display: "flex", alignItems: "center", gap: 6, fontWeight: 700, color: "#000" }}>
                    <input type="checkbox" checked={t.isDone} onChange={() => toggleDone(t)} style={{ marginRight: 4, transform: "scale(1.3)", accentColor: "#10b981" }} />
                    เสร็จแล้ว
                  </label>

                  <button
                    onClick={(e) => { e.preventDefault(); e.stopPropagation(); deleteTodo(t.id); }}
                    title="ลบรายการนี้"
                    style={{
                      cursor: "pointer", border: "none", background: "rgba(220, 38, 38, 0.2)",
                      fontSize: 16, color: "#dc2626", fontWeight: 900, width: 36, height: 36, borderRadius: 12,
                      display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.2s ease", lineHeight: 1
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.background = "rgba(220, 38, 38, 0.3)"; e.currentTarget.style.transform = "scale(1.1)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.background = "rgba(220, 38, 38, 0.2)"; e.currentTarget.style.transform = "scale(1)"; }}
                  >
                    🗑️
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        {todos.length === 0 && (
          <div style={{ textAlign: "center", padding: "80px 20px", color: "#64748b", fontSize: 20, background: "rgba(255,255,255,0.05)", borderRadius: 20, border: "2px dashed rgba(255,255,255,0.1)", marginTop: 40 }}>
            <div style={{ fontSize: 48, marginBottom: 16 }}>📝</div>
            <div style={{ fontWeight: 600, marginBottom: 8 }}>ยังไม่มีรายการ</div>
            <div style={{ fontSize: 16, opacity: 0.7 }}>เริ่มเพิ่มรายการแรกของคุณเลย! ✨</div>
          </div>
        )}
      </div>
    </div>
  );
}

/* ========= Form styles ========= */
const ROW_H = 52;
const formRow: React.CSSProperties = {
  display: "grid",
  gridTemplateColumns: "minmax(280px,1fr) 180px 180px 280px 120px",
  gap: 16,
  alignItems: "stretch",
  marginBottom: 32,
};
const inputBase: React.CSSProperties = {
  height: ROW_H,
  padding: "0 16px",
  borderRadius: 16,
  border: "2px solid #334155",
  background: "rgba(30, 41, 59, 0.8)",
  backdropFilter: "blur(10px)",
  color: "#f1f5f9",
  outline: "none",
  boxSizing: "border-box",
  fontSize: 14,
  fontWeight: 500,
  transition: "all 0.3s ease",
};
const addBtn: React.CSSProperties = {
  height: ROW_H,
  borderRadius: 16,
  fontWeight: 700,
  padding: "0 20px",
  border: "none",
  background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
  color: "white",
  cursor: "pointer",
  fontSize: 14,
  transition: "all 0.3s ease",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  boxSizing: "border-box",
  boxShadow: "0 4px 15px rgba(16, 185, 129, 0.3)",
};

/* ========= Date field + Calendar ========= */
function DateField({ value, onChange, disabled = false }: { value: string; onChange: (v: string) => void; disabled?: boolean }) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onClick = (e: MouseEvent) => { if (!ref.current?.contains(e.target as Node)) setOpen(false); };
    window.addEventListener("click", onClick);
    return () => window.removeEventListener("click", onClick);
  }, []);

  const display = value ? new Date(value).toLocaleDateString("th-TH") : "";

  return (
    <div ref={ref} style={{ position: "relative" }}>
      <input
        readOnly
        value={display}
        onClick={() => !disabled && setOpen((prev) => !prev)}
        placeholder="📅 เลือกวันที่..."
        style={{ ...inputBase, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1 }}
        disabled={disabled}
      />
      {open && !disabled && (
        <div
          style={{
            position: "absolute", top: ROW_H + 12, left: 0, width: 500, background: "rgba(30, 41, 59, 0.95)",
            backdropFilter: "blur(20px)", border: "2px solid #475569", borderRadius: 20, boxShadow: "0 25px 50px rgba(0,0,0,0.4)", zIndex: 9999,
          }}
          onClick={(e) => e.stopPropagation()}
        >
          <Calendar value={value} onChange={(v) => { onChange(v); setOpen(false); }} />
        </div>
      )}
    </div>
  );
}

function Calendar({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const today = new Date();
  const selected = value ? new Date(value) : null;
  const [y, setY] = useState(selected?.getFullYear() ?? today.getFullYear());
  const [m, setM] = useState(selected?.getMonth() ?? today.getMonth());

  useEffect(() => {
    if (selected) { setY(selected.getFullYear()); setM(selected.getMonth()); }
  }, [value]);

  const monthNames = ["มกราคม","กุมภาพันธ์","มีนาคม","เมษายน","พฤษภาคม","มิถุนายน","กรกฎาคม","สิงหาคม","กันยายน","ตุลาคม","พฤศจิกายน","ธันวาคม"];
  const weekdays = ["อา","จ","อ","พ","พฤ","ศ","ส"];

  const cells = (() => {
    const first = new Date(y, m, 1);
    const start = first.getDay();
    const daysIn = new Date(y, m + 1, 0).getDate();
    const arr: { s: string; d: number; inMonth: boolean }[] = [];

    for (let i = start - 1; i >= 0; i--) {
      const prevMonth = m === 0 ? 11 : m - 1;
      const prevYear = m === 0 ? y - 1 : y;
      const prevDays = new Date(prevYear, prevMonth + 1, 0).getDate();
      const d = prevDays - i;
      arr.push({ s: toIsoDate(new Date(prevYear, prevMonth, d)), d, inMonth: false });
    }
    for (let d = 1; d <= daysIn; d++) arr.push({ s: toIsoDate(new Date(y, m, d)), d, inMonth: true });

    const nextMonth = m === 11 ? 0 : m + 1;
    const nextYear = m === 11 ? y + 1 : y;
    const targetCells = arr.length <= 35 ? 35 : 42;
    for (let d = 1; arr.length < targetCells; d++) arr.push({ s: toIsoDate(new Date(nextYear, nextMonth, d)), d, inMonth: false });

    return arr;
  })();

  const isToday = (s: string) => s === toIsoDate(today);
  const isSelected = (s: string) => (selected ? s === toIsoDate(selected) : false);

  const goPrev = () => { if (m === 0) { setY(y - 1); setM(11); } else setM(m - 1); };
  const goNext = () => { if (m === 11) { setY(y + 1); setM(0); } else setM(m + 1); };

  return (
    <div style={{ padding: 20 }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20 }}>
        <button onClick={goPrev} style={navBtn}>‹</button>
        <div style={{
          textAlign: "center", fontWeight: 700, fontSize: 18, color: "#f1f5f9",
          background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text",
        }}>
          {monthNames[m]} {y + 543}
        </div>
        <button onClick={goNext} style={navBtn}>›</button>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 6, fontSize: 12, opacity: 0.7, marginBottom: 12, textAlign: "center" }}>
        {weekdays.map((w) => <div key={w} style={{ padding: "10px 0", fontWeight: 600 }}>{w}</div>)}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 4, width: "100%", padding: "8px" }}>
        {cells.map((c, i) => {
          const today = isToday(c.s);
          const selected = isSelected(c.s);
          const inMonth = c.inMonth;
          return (
            <button
              key={i}
              onClick={() => onChange(c.s)}
              style={{
                minWidth: 44, width: 44, height: 44, borderRadius: 12,
                border: `2px solid ${selected ? "#8b5cf6" : "#475569"}`,
                background: selected ? "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)"
                  : today ? "rgba(139, 92, 246, 0.2)"
                  : inMonth ? "rgba(51, 65, 85, 0.6)"
                  : "rgba(51, 65, 85, 0.3)",
                color: selected ? "#ffffff" : inMonth ? "#f1f5f9" : "#94a3b8",
                fontWeight: selected ? 700 : today ? 600 : inMonth ? 500 : 400,
                cursor: "pointer", fontSize: 14, transition: "all 0.2s ease",
                display: "flex", alignItems: "center", justifyContent: "center", margin: "auto",
                boxSizing: "border-box", backdropFilter: "blur(5px)",
              }}
              onMouseEnter={(e) => {
                if (!selected) {
                  e.currentTarget.style.background = inMonth ? "rgba(139, 92, 246, 0.3)" : "rgba(139, 92, 246, 0.2)";
                  e.currentTarget.style.borderColor = "#8b5cf6";
                  e.currentTarget.style.transform = "scale(1.05)";
                }
              }}
              onMouseLeave={(e) => {
                if (!selected) {
                  e.currentTarget.style.background = today ? "rgba(139, 92, 246, 0.2)" : inMonth ? "rgba(51, 65, 85, 0.6)" : "rgba(51, 65, 85, 0.3)";
                  e.currentTarget.style.borderColor = "#475569";
                  e.currentTarget.style.transform = "scale(1)";
                }
              }}
            >
              {c.d}
            </button>
          );
        })}
      </div>

      <div style={{ display: "flex", justifyContent: "space-between", marginTop: 20, fontSize: 14 }}>
        <button
          style={{ ...linkBtn, background: "linear-gradient(135deg, #8b5cf6 0%, #ec4899 100%)", color: "white", fontWeight: 600, padding: "10px 16px", borderRadius: 10 }}
          onClick={() => onChange(toIsoDate(new Date()))}
        >
          📅 วันนี้
        </button>
        <div style={{ display: "flex", gap: 16 }}>
          <button style={{ ...linkBtn, color: "#ef4444", fontWeight: 600, padding: "10px 16px", background: "rgba(239, 68, 68, 0.1)", borderRadius: 10 }} onClick={() => onChange("")}>
            🗑️ ล้าง
          </button>
          <button style={{ ...linkBtn, color: "#64748b", fontWeight: 600, padding: "10px 16px", background: "rgba(100, 116, 139, 0.1)", borderRadius: 10 }}>
            ✕ ปิด
          </button>
        </div>
      </div>
    </div>
  );
}

const navBtn: React.CSSProperties = {
  width: 40, height: 40, borderRadius: 12, border: "2px solid #475569",
  background: "rgba(51, 65, 85, 0.8)", backdropFilter: "blur(10px)", color: "#f1f5f9",
  cursor: "pointer", fontWeight: 700, fontSize: 20, display: "flex", alignItems: "center", justifyContent: "center",
  transition: "all 0.2s ease",
};

const linkBtn: React.CSSProperties = {
  background: "transparent", border: "none", cursor: "pointer", fontWeight: 600, transition: "all 0.2s ease",
};
