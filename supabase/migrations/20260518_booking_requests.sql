create table if not exists public.booking_requests (
  id bigint generated always as identity primary key,
  client_request_id text not null unique,
  status text not null default 'pending' check (status in ('pending', 'confirmed', 'failed')),
  service_type text not null default 'tk_ek',
  slot_id text not null,
  slot_start_at timestamptz null,
  customer_name text not null,
  customer_phone text not null,
  customer_email text null,
  vehicle_plate text null,
  vehicle_vin text null,
  note text null,
  external_booking_id text null,
  external_response jsonb null,
  error_message text null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists booking_requests_created_at_idx on public.booking_requests (created_at desc);
create index if not exists booking_requests_status_idx on public.booking_requests (status);
