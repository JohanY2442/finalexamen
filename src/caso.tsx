import { useState } from "react";
import type { ChangeEvent, FormEvent } from "react";
import { Link, useParams } from "react-router-dom";
import { api, apiError, useFetch } from "./api";
import { Alert, Field } from "./components/ui";
import type { ExtraView } from "./components/ui";

export const PATH = "/materials";
export const HOME = "/dashboard";
export const TITLE = "BibliotecaUTEC";
const MIN = 1;
const MAX = 7;
const NO_COPIES = "NO_COPIES";
const NO_COPIES_MSG = "no hay copias disponibles.";
const INVALID_STATE = "INVALID_STATE";

export type Item = { id: number; title: string; author: string; category: string; availableCopies: number; description: string };
type Detail = Item;
type Booking = { id: number; resourceId: number; resourceName: string; days: number; status: string };

export function ItemCard({ item }: { item: Item }) {
  return (
    <>
      <p className="font-semibold">{item.title}</p>
      <p className="text-sm text-gray-600">
        Edificio: {item.author} · Piso: {item.category} · Turnos disponibles: {item.availableCopies}
      </p>
    </>
  );
}

export function DetailPage() {
  const { id } = useParams();
  const { data, loading, error, reload } = useFetch<Detail>(`${PATH}/${id}`);
  const [form, setForm] = useState({ days: "" });
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [result, setResult] = useState("");
  const [apiErr, setApiErr] = useState("");
  const [sending, setSending] = useState(false);

  if (!data) return loading ? <p>Cargando...</p> : <Alert>{error}</Alert>;

  const onChange = (e: ChangeEvent<HTMLInputElement>) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const validate = () => {
    const e: Record<string, string> = {};
    const n = Number(form.days);
    if (form.days === "" || !Number.isInteger(n) || n < MIN || n > MAX)
      e.days = `Ingresa un número entero entre ${MIN} y ${MAX}.`;
    return e;
  };

  const onSubmit = async (ev: FormEvent) => {
    ev.preventDefault();
    const e = validate();
    setErrors(e);
    setResult("");
    setApiErr("");
    if (Object.keys(e).length > 0) return;
    setSending(true);
    try {
      await api.post(`${PATH}/${id}/bookings`, { days: Number(form.days) });
      setResult("Prestamo confirmada.");
      setForm({ days: "" });
      reload(); 
    } catch (err) {
      const x = apiError(err);
      setApiErr(x.code === NO_COPIES ? NO_COPIES_MSG : x.message);
      if (x.code === NO_COPIES) reload();
    } finally {
      setSending(false);
    }
  };

  return (
    <section className="space-y-4">
      <Link to={HOME} className="text-blue-600 underline">← Volver al dashboard</Link>
      <h1 className="text-2xl font-bold">{data.title}</h1>
      <p>{data.description}</p>
      <p>Edificio: {data.author} · Piso: {data.category} · Turnos disponibles: {data.availableCopies}</p>
      <form onSubmit={onSubmit} noValidate className="space-y-3 rounded border p-4">
        <Field label="Número de asistentes" error={errors.days}>
          <input name="days" type="number" min={MIN} max={MAX} step={1} value={form.days} onChange={onChange} />
        </Field>
        {apiErr && <Alert>{apiErr}</Alert>}
        {result && <Alert ok>{result}</Alert>}
        <button type="submit" disabled={sending}>{sending ? "Enviando..." : "Reservar"}</button>
      </form>
      <Link to="/my-bookings" className="text-blue-600 underline">Ver mis reservas</Link>
    </section>
  );
}

function MyBookingsPage() {
  const { data, loading, error, reload } = useFetch<Booking[]>("/me/bookings");
  const [msg, setMsg] = useState("");
  const [apiErr, setApiErr] = useState("");

  const cancel = async (b: Booking) => {
    if (!window.confirm(`¿Cancelar la reserva #${b.id} de ${b.resourceName}?`)) return;
    setMsg("");
    setApiErr("");
    try {
      await api.patch(`/bookings/${b.id}/cancel`);
      setMsg(`Reserva #${b.id} cancelada.`);
    } catch (err) {
      const x = apiError(err);
      setApiErr(x.code === INVALID_STATE ? "La reserva cambió de estado. Se actualizó la lista." : x.message);
    }
    reload(); 
  };

  return (
    <section className="space-y-4">
      <h1 className="text-2xl font-bold">Mis reservas</h1>
      {loading && <p className="text-gray-500">Cargando...</p>}
      {error && <div className="flex flex-wrap items-center gap-3"><Alert>{error}</Alert><button onClick={reload}>Reintentar</button></div>}
      {msg && <Alert ok>{msg}</Alert>}
      {apiErr && <Alert>{apiErr}</Alert>}
      {!loading && data?.length === 0 && <p>Todavía no tienes reservas.</p>}
      <ul className="space-y-2">
        {data?.map((b) => (
          <li key={b.id} className="flex flex-wrap items-center justify-between gap-2 rounded border p-3">
            <p>#{b.id} · <span className="font-semibold">{b.resourceName}</span> · {b.days} asistente(s) · {b.status === "ACTIVE" ? "Activa" : "Cancelada"}</p>
            {b.status === "ACTIVE" && <button onClick={() => cancel(b)}>Cancelar</button>}
          </li>
        ))}
      </ul>
    </section>
  );
}

export const EXTRA: ExtraView[] = [{ path: "/my-bookings", label: "Mis reservas", element: <MyBookingsPage /> }];




