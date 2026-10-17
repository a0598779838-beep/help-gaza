-- Only lookup categories are seeded. No real organizations or aid announcements are fabricated.
insert into public.categories(name, slug) values
  ('المساعدات الغذائية', 'food'),
  ('المساعدات النقدية', 'cash'),
  ('المساعدات الصحية والعلاجية', 'health'),
  ('مساعدات الإيواء والخيام', 'shelter'),
  ('المساعدات التعليمية والمنح', 'education'),
  ('مساعدات الأيتام والأطفال', 'children'),
  ('مساعدات ذوي الإعاقة', 'disability'),
  ('مساعدات النساء والأسر', 'families'),
  ('المساعدات الشتوية', 'winter'),
  ('مساعدات عامة', 'general')
on conflict (slug) do nothing;

insert into public.organizations (
  name, slug, description, official_website, registration_url, verification_status, verified_at
) values (
  'النظام المركزي للمساعدات — قطاع غزة',
  'central-aid-system-gaza',
  'رابط التسجيل/الدخول للمنصة كما يظهر في الصفحة. لم يتم التحقق من الجهة المشغلة أو اعتماد الموقع رسميًا.',
  'https://egaza.org/Home/Login',
  'https://egaza.org/Home/Login',
  'unverified',
  null
)
on conflict (slug) do update set
  description = excluded.description,
  official_website = excluded.official_website,
  registration_url = excluded.registration_url,
  verification_status = excluded.verification_status,
  verified_at = excluded.verified_at;

insert into public.organizations (
  name, slug, description, registration_url, verification_status, verified_at
) values (
  'تسجيل الغاز — قطاع غزة',
  'gaza-gas-registration',
  'رابط تسجيل الغاز الذي زودنا به المستخدم. تعذر التحقق من الموقع آليًا، فتحقق من هوية الجهة قبل إدخال بيانات شخصية.',
  'https://e-gaza.com/login',
  'unverified',
  null
)
on conflict (slug) do update set
  description = excluded.description,
  registration_url = excluded.registration_url,
  verification_status = excluded.verification_status,
  verified_at = excluded.verified_at;

insert into public.organizations (
  name, slug, description, official_website, registration_url, verification_status, verified_at
) values (
  'مؤسسة السنابل للشباب والتنمية',
  'alsanabel-youth-development',
  'الموقع الرسمي للمؤسسة مع رابط تسجيل المواطنين. فتح الرابط لا يضمن أن التسجيل متاح حاليًا أو قبول الطلب.',
  'https://alsanabel.org/',
  'https://aid.alsanabel.org/public/registration',
  'verified',
  now()
)
on conflict (slug) do update set
  description = excluded.description,
  official_website = excluded.official_website,
  registration_url = excluded.registration_url,
  verification_status = excluded.verification_status,
  verified_at = excluded.verified_at;

insert into public.organizations (
  name, slug, description, registration_url, verification_status, verified_at
) values (
  'المركز السعودي للثقافة والتراث',
  'saudi-center-culture-heritage',
  'رابط تسجيل للاستفادة من المساعدات العينية كما يظهر في الصفحة المرفقة. لم يتم التحقق المستقل من الجهة المشغلة أو استمرار فتح التسجيل.',
  'https://portal.ksah.org/beneficial-update',
  'unverified',
  null
)
on conflict (slug) do update set
  description = excluded.description,
  registration_url = excluded.registration_url,
  verification_status = excluded.verification_status,
  verified_at = excluded.verified_at;

insert into public.organizations (
  name, slug, description, registration_url, verification_status, verified_at
) values (
  'معهد الأمل للأيتام',
  'al-amal-orphans-institute',
  'نموذج بيانات أيتام للعام 2023–2024 بحسب عنوان النموذج. قد يكون التسجيل قديمًا أو مغلقًا، ويتطلب النموذج تسجيل الدخول إلى Google ورفع صورة.',
  'https://docs.google.com/forms/d/e/1FAIpQLSdD6X9dZhA7uXR9vitQtDlPsWQpFas-_-Ltw-QWmUqKdC2HZQ/viewform?pli=1',
  'unverified',
  null
)
on conflict (slug) do update set
  description = excluded.description,
  registration_url = excluded.registration_url,
  verification_status = excluded.verification_status,
  verified_at = excluded.verified_at;

insert into public.organizations (
  name, slug, description, registration_url, verification_status, verified_at
) values (
  'جمعية قطوف الخير',
  'kotof-al-khair',
  'نموذج تسجيل مباشر على الرابط المرفق. فتح النموذج لا يعني أن التسجيل متاح أو أن الطلب سيُقبل.',
  'https://aid.kotof.org/public/index.php/registration',
  'verified',
  now()
)
on conflict (slug) do update set
  description = excluded.description,
  registration_url = excluded.registration_url,
  verification_status = excluded.verification_status,
  verified_at = excluded.verified_at;

insert into public.organizations (
  name, slug, description, official_website, support_url, registration_url, verification_status, verified_at
) values (
  'برنامج الأغذية العالمي (WFP)',
  'wfp-palestine',
  'صفحة البرنامج الرسمية بشأن فلسطين. يتوفر رابط تسجيل المستفيدين، كما يتوفر رابط منفصل للاستفسار عبر المحادثة.',
  'https://www.wfp.org/countries/palestine',
  'https://aidhotline.wfp.org/palestine',
  'https://pal.beneficiaryregistration.cbt.wfp.org/form/consent',
  'verified',
  now()
)
on conflict (slug) do update set
  description = excluded.description,
  official_website = excluded.official_website,
  support_url = excluded.support_url,
  registration_url = excluded.registration_url,
  verification_status = excluded.verification_status,
  verified_at = excluded.verified_at;

insert into public.organizations (
  name, slug, description, official_website, verification_status, verified_at
) values
  (
    'منظمة الأمم المتحدة للطفولة (UNICEF)',
    'unicef-palestine',
    'الموقع الرسمي لليونيسف في دولة فلسطين. لا يتوفر رابط تسجيل مساعدات فردية موثق.',
    'https://www.unicef.org/sop/',
    'verified',
    now()
  ),
  (
    'الهلال الأحمر الإماراتي — الفارس الشهم 3',
    'emirates-red-crescent',
    'الموقع الرسمي للهلال الأحمر الإماراتي. لا يتوفر هنا رابط تسجيل مساعدات فردية موثق.',
    'https://www.emiratesrc.ae/',
    'verified',
    now()
  ),
  (
    'جمعية الفجر الشبابي الفلسطيني',
    'fpya',
    'الموقع الإلكتروني للجمعية. لم يُدرج رابط تسجيل مساعدات لعدم التحقق من وجود تسجيل حالي.',
    'https://home.fpya.ps/',
    'verified',
    now()
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  official_website = excluded.official_website,
  verification_status = excluded.verification_status,
  verified_at = excluded.verified_at;
