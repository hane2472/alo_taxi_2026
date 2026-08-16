DELETE FROM public.orders;
DELETE FROM public.commission_settlements;
DELETE FROM public.audit_logs;
DELETE FROM public.accounting_periods;
INSERT INTO public.accounting_periods (name, start_date, status)
VALUES ('عمولات ' || to_char(current_date, 'MM/YYYY'), current_date, 'open');
ALTER SEQUENCE public.order_number_seq RESTART WITH 1;
ALTER TABLE public.orders ALTER COLUMN order_number SET DEFAULT ('AT-' || lpad((nextval('order_number_seq'::regclass))::text, 4, '0'));