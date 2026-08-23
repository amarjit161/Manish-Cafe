insert into public.document_types (code, name, description, allowed_mime_types, max_file_size_bytes) values
  ('aadhaar', 'Aadhaar Card', 'Aadhaar card (front and back)', array['application/pdf','image/jpeg','image/png'], 10485760),
  ('pan', 'PAN Card', 'PAN card copy', array['application/pdf','image/jpeg','image/png'], 10485760),
  ('photo', 'Passport Photo', 'Recent passport-size photograph', array['image/jpeg','image/png'], 5242880),
  ('address_proof', 'Address Proof', 'Utility bill, rent agreement, or similar', array['application/pdf','image/jpeg','image/png'], 10485760),
  ('income_proof', 'Income Proof', 'Salary slip, Form 16, or similar', array['application/pdf','image/jpeg','image/png'], 10485760),
  ('signature', 'Signature', 'Scanned signature', array['image/jpeg','image/png'], 2097152)
on conflict (code) do nothing;

insert into public.services (name, description, category, customer_price, is_active) values
  ('Aadhaar Card Update', 'Update address, mobile number, or other details on your Aadhaar card.', 'Government Services', 150, true),
  ('PAN Card Application', 'Apply for a new PAN card or correction to an existing one.', 'Government Services', 300, true),
  ('Income Certificate', 'Apply for an income certificate from the local authority.', 'Government Services', 200, true),
  ('Passport Application Assistance', 'Assistance filling and submitting a passport application.', 'Government Services', 500, true),
  ('Voter ID Registration / Correction', 'New voter ID registration or correction of existing details.', 'Government Services', 150, true);

insert into public.service_document_types (service_id, document_type_id, is_mandatory, display_order)
select s.id, d.id, m.is_mandatory, m.display_order
from (values
  ('Aadhaar Card Update', 'photo', true, 1),
  ('Aadhaar Card Update', 'address_proof', true, 2),
  ('PAN Card Application', 'aadhaar', true, 1),
  ('PAN Card Application', 'photo', true, 2),
  ('PAN Card Application', 'signature', true, 3),
  ('Income Certificate', 'aadhaar', true, 1),
  ('Income Certificate', 'income_proof', true, 2),
  ('Income Certificate', 'address_proof', false, 3),
  ('Passport Application Assistance', 'aadhaar', true, 1),
  ('Passport Application Assistance', 'photo', true, 2),
  ('Passport Application Assistance', 'address_proof', true, 3),
  ('Voter ID Registration / Correction', 'aadhaar', true, 1),
  ('Voter ID Registration / Correction', 'photo', true, 2),
  ('Voter ID Registration / Correction', 'address_proof', true, 3)
) as m(service_name, doc_code, is_mandatory, display_order)
join public.services s on s.name = m.service_name
join public.document_types d on d.code = m.doc_code;

insert into public.service_costs (service_id, internal_cost)
select s.id, case s.name
  when 'Aadhaar Card Update' then 60
  when 'PAN Card Application' then 120
  when 'Income Certificate' then 80
  when 'Passport Application Assistance' then 250
  when 'Voter ID Registration / Correction' then 60
end
from public.services s
where s.name in ('Aadhaar Card Update','PAN Card Application','Income Certificate','Passport Application Assistance','Voter ID Registration / Correction');
