update public.services set slug = 'aadhaar-card-update' where name = 'Aadhaar Card Update';
update public.services set slug = 'pan-card-application' where name = 'PAN Card Application';
update public.services set slug = 'income-certificate' where name = 'Income Certificate';
update public.services set slug = 'passport-application-assistance' where name = 'Passport Application Assistance';
update public.services set slug = 'voter-id-registration-correction' where name = 'Voter ID Registration / Correction';

-- Address proof is only actually required for an Aadhaar update when the
-- customer is changing their address -- make it conditional rather than
-- unconditionally mandatory, matching the real-world requirement.
update public.service_document_types sdt
set is_mandatory = false, condition_key = 'address'
from public.services s, public.document_types dt
where sdt.service_id = s.id
  and sdt.document_type_id = dt.id
  and s.slug = 'aadhaar-card-update'
  and dt.code = 'address_proof';
