import type { FirmPublication, Language, SpecialtyId } from '../types/legal.js';

export interface SpecialtyContent {
  id: SpecialtyId;
  number: string;
  title: Record<Language, string>;
  subtitle: Record<Language, string>;
  description: Record<Language, string>;
  documentsNeeded: Record<Language, string[]>;
  leadLawyer: Record<Language, string>;
}

export interface LawyerProfile {
  id: string;
  number: string;
  initials: Record<Language, string>;
  name: Record<Language, string>;
  role: Record<Language, string>;
  credential?: Record<Language, string>;
  bio: Record<Language, string>;
  focusAreas: Record<Language, string[]>;
  isDirector?: boolean;
}

export interface CoreServiceItem {
  num: string;
  title: Record<Language, string>;
}

export interface TestimonialItem {
  id: string;
  clientName: Record<Language, string>;
  caseType: Record<Language, string>;
  quote: Record<Language, string>;
  outcome: Record<Language, string>;
}

export interface BranchOfficeInfo {
  id: 'irbid' | 'amman';
  name: Record<Language, string>;
  address: Record<Language, string>;
  badge: Record<Language, string>;
  mapQuery: string;
  embedUrl: string;
  directionsUrl: string;
}

export const ASSET_IMAGES = {
  radwanPortrait: '/assets/brand/radwan-portrait.jpg',
  logoScale: '/assets/brand/rb-scale-logo.png',
  logoCrownEmblem: '/assets/brand/rb-crown-emblem.png',
  irbidOffice: '/src/assets/images/irbid_office_clean_1794914147150.jpg',
};

export const FIRM_CONTACT = {
  phoneDisplay: '0796251902',
  phoneHref: 'tel:+962796251902',
  emailDisplay: 'info@alradwan-law.jo',
  branches: [
    {
      id: 'irbid',
      name: { ar: 'فرع إربد', en: 'Irbid Branch' },
      address: {
        ar: 'شارع الثلاثين — إشارة الضباط',
        en: '30th Street — Al-Dubbat Signal',
      },
      badge: { ar: 'المقر الرئيسي — شمال المملكة', en: 'Northern Jordan Headquarters' },
      mapQuery: '32.5517807,35.8628263',
      embedUrl: 'https://maps.google.com/maps?q=32.5517807,35.8628263&hl=ar&z=16&output=embed',
      directionsUrl: 'https://www.google.com/maps/search/?api=1&query=32.5517807,35.8628263',
    },
    {
      id: 'amman',
      name: { ar: 'فرع عمّان', en: 'Amman Branch' },
      address: {
        ar: 'عمّان — شارع مكة — مجمع داوود',
        en: 'Amman — Mecca Street — Dawood Complex',
      },
      badge: { ar: 'العاصمة عمّان', en: 'Amman Capital Office' },
      mapQuery: 'Amman Mecca Street Dawood Complex Jordan',
      embedUrl:
        'https://maps.google.com/maps?q=Amman+Mecca+Street+Dawood+Complex+Jordan&hl=ar&z=15&output=embed',
      directionsUrl:
        'https://www.google.com/maps/search/?api=1&query=Amman+Mecca+Street+Dawood+Complex+Jordan',
    },
  ] as BranchOfficeInfo[],
};

export const FOUNDER_PROFILE = {
  name: {
    ar: 'المحامي رضوان علي بطاينة',
    en: 'Attorney Radwan Ali Bataineh',
  },
  shortName: {
    ar: 'المحامي رضوان البطاينة',
    en: 'Attorney Radwan Al-Bataineh',
  },
  title: {
    ar: 'المؤسس والمدير العام — شركة الرضوان للقانون والتحكيم',
    en: 'Founder & Managing Director — Al-Radwan Law & Arbitration',
  },
  credential: {
    ar: 'ماجستير علوم سياسية وعلاقات دولية',
    en: "Master's in Political Science & International Relations",
  },
  leadershipHeading: {
    ar: 'المحامي رضوان البطاينة — القيادة والرؤية القانونية',
    en: 'Attorney Radwan Al-Bataineh — Legal Leadership & Vision',
  },
  executiveBio: {
    ar: 'يقود المحامي رضوان علي بطاينة شركة الرضوان للقانون والتحكيم (RB LEGAL) بصفته المؤسس والمدير العام، واضعاً معياراً رفيعاً للعمل القانوني المؤسسي في الأردن. يجمع في ممارسته بين العمق التشريعي والإجرائي أمام المحاكم وهيئات التحكيم، وبين الرؤية الاستراتيجية المستندة إلى دراساته العليا في العلوم السياسية والعلاقات الدولية.',
    en: 'Attorney Radwan Ali Bataineh leads Al-Radwan Law & Arbitration (RB LEGAL) as Founder and Managing Director, setting an institutional standard for legal advocacy and arbitration in Jordan by uniting procedural rigor with strategic insight.',
  },
  visionStatement: {
    ar: 'تقوم رؤيتنا على أن التمثيل القانوني المتميز ليس إجراءً روتينياً، بل هندسة قانونية متكاملة تحفظ الحقوق وتحصّن القرارات الاستثمارية والمدنية والأسرية وفق أحكام التشريعات الأردنية وأعلى معايير السرية والانضباط.',
    en: 'Our legal vision treats representation as disciplined legal strategy—protecting civil, commercial, administrative, and personal rights under Jordanian law with strict confidentiality and institutional rigor.',
  },
  achievementsAndScope: [
    {
      title: {
        ar: 'الإشراف المباشر على القضايا الكبرى والتحكيم',
        en: 'Direct Oversight of Complex Litigation & Arbitration',
      },
      detail: {
        ar: 'قيادة استراتيجيات الترافع في المنازعات الحقوقية والتجارية والإدارية وصياغة مشارطات واتفاقيات التحكيم والوساطة.',
        en: 'Leading litigation strategy across civil, commercial, and administrative disputes as well as arbitration and mediation proceedings.',
      },
    },
    {
      title: {
        ar: 'الحوكمة المؤسسية وإدارة فرعي عمّان وإربد',
        en: 'Institutional Governance Across Amman & Irbid',
      },
      detail: {
        ar: 'توحيد معايير الصياغة القانونية ومراجعة اللوائح والمذكرات والاتفاقيات عبر مكتبي الشركة في عمّان وإربد.',
        en: 'Standardizing pleading quality, contract review, and legal advisory workflows across both the Amman and Irbid offices.',
      },
    },
    {
      title: {
        ar: 'التفكير الاستراتيجي والعلاقات الدولية',
        en: 'Strategic & International Relations Perspective',
      },
      detail: {
        ar: 'توظيف التأهيل الأكاديمي في العلوم السياسية والعلاقات الدولية في قراءة العقود، الحوكمة، وتسوية النزاعات التجارية بفعالية.',
        en: 'Applying graduate training in Political Science and International Relations to complex contracts, governance, and dispute settlement.',
      },
    },
    {
      title: {
        ar: 'التحول الرقمي القانوني (RB LEGAL AI)',
        en: 'LegalTech Modernization (RB LEGAL AI)',
      },
      detail: {
        ar: 'قيادة بناء منظومة عمل قانونية ذكية خاصة بمحامي الشركة لتسريع البحث التشريعي وإعداد المسودات بدقة عالية وتحت الإشراف البشري الكامل.',
        en: 'Spearheading an internal AI-assisted legal office exclusively for registered firm attorneys under strict human-in-the-loop review.',
      },
    },
  ],
  cvSections: {
    education: {
      ar: [
        'ماجستير في العلوم السياسية والعلاقات الدولية',
        'بكالوريوس في القانون — ممارسة المحاماة النظامية والتحكيم في المملكة الأردنية الهاشمية',
      ],
      en: [
        "Master's Degree in Political Science & International Relations",
        'Bachelor of Laws (LL.B.) — Licensed Legal Practice & Arbitration in the Hashemite Kingdom of Jordan',
      ],
    },
    positions: {
      ar: [
        'المؤسس والمدير العام — شركة الرضوان للقانون والتحكيم (RB LEGAL)',
        'المشرف العام على فرعي عمّان (شارع مكة — مجمع داوود) وإربد (شارع الثلاثين — إشارة الضباط)',
      ],
      en: [
        'Founder & Managing Director — Al-Radwan Law & Arbitration (RB LEGAL)',
        'Managing Head of Amman (Mecca St — Dawood Complex) and Irbid (30th St — Al-Dubbat Signal) Offices',
      ],
    },
    coreFocus: {
      ar: [
        'التحكيم التجاري والوساطة وتسوية النزاعات',
        'المرافعات المدنية والحقوقية والتعويضات',
        'القضاء الإداري ودوائر التنفيذ',
        'صياغة ومراجعة العقود والاتفاقيات الاستثمارية والتجارية',
      ],
      en: [
        'Commercial Arbitration, Mediation & Dispute Settlement',
        'Civil Litigation, Contracts & Compensation Claims',
        'Administrative Litigation & Execution Proceedings',
        'Commercial & Investment Agreement Drafting',
      ],
    },
  },
};

export const CORE_SERVICES: CoreServiceItem[] = [
  {
    num: '01',
    title: {
      ar: 'التمثيل القانوني أمام المحاكم',
      en: 'Courtroom Legal Representation',
    },
  },
  {
    num: '02',
    title: {
      ar: 'القضايا المدنية والجنائية',
      en: 'Civil & Criminal Litigation',
    },
  },
  {
    num: '03',
    title: {
      ar: 'إعداد وصياغة العقود والاتفاقيات',
      en: 'Contract & Agreement Drafting',
    },
  },
  {
    num: '04',
    title: {
      ar: 'الاستشارات القانونية في مختلف المجالات',
      en: 'Comprehensive Legal Consultations',
    },
  },
  {
    num: '05',
    title: {
      ar: 'حل النزاعات والتحكيم والوساطة',
      en: 'Arbitration & Mediation',
    },
  },
];

export const SPECIALTIES: SpecialtyContent[] = [
  {
    id: 'civil',
    number: '01',
    title: {
      ar: 'القضايا المدنية والحقوقية',
      en: 'Civil & Property Litigation',
    },
    subtitle: {
      ar: 'شيكات · عقارات · تعويضات ومطالبات مالية',
      en: 'Checks · Real Estate · Compensation & Claims',
    },
    description: {
      ar: 'تمثيل قانوني راسخ أمام محاكم الصلح والبداية والاستئناف والتمييز لحماية الأموال والعقارات وتحصيل الحقوق والتعويضات وفق القانون المدني الأردني.',
      en: 'Authoritative advocacy before Magistrate, First Instance, Appeals, and Cassation courts to protect property, receivables, and compensation claims.',
    },
    documentsNeeded: {
      ar: [
        'الكمبيالات أو الشيكات البنكية وورقة الاعتراض',
        'سندات التسجيل العقاري أو عقود الإيجار والمقاولة',
        'الإنذارات العدلية والمراسلات الموثقة',
      ],
      en: [
        'Promissory notes, returned checks, and bank protest memos',
        'Land registry title deeds (Kushan) or lease contracts',
        'Notarized legal notices and documented correspondence',
      ],
    },
    leadLawyer: {
      ar: 'المحامي رضوان علي بطاينة',
      en: 'Attorney Radwan Ali Bataineh',
    },
  },
  {
    id: 'sharia',
    number: '02',
    title: {
      ar: 'القضايا الشرعية والأحوال الشخصية',
      en: 'Sharia & Personal Status Law',
    },
    subtitle: {
      ar: 'طلاق · نفقة · حضانة · مواريث وتركات',
      en: 'Divorce · Alimony · Custody · Inheritance',
    },
    description: {
      ar: 'رعاية قانونية دقيقة وبسرية تامة أمام المحاكم الشرعية في قضايا النفقة، الحضانة، الشقاق والنزاع، وتقسيم التركات وفق قانون الأحوال الشخصية الأردني.',
      en: 'Discreet, principled representation before Sharia courts across alimony, child custody, marital disputes, and estate distribution.',
    },
    documentsNeeded: {
      ar: [
        'عقد الزواج المصدق أو حجة الطلاق',
        'دفتر العائلة وشهادات ميلاد الأطفال',
        'حصر الإرث وسندات أموال التركة إن وجدت',
      ],
      en: [
        'Certified marriage contract or divorce deed',
        'Family book and children birth certificates',
        'Inheritance deed (Hasr Al-Irth) and asset records',
      ],
    },
    leadLawyer: {
      ar: 'المحامية نجوى الشطناوي',
      en: 'Attorney Najwa Al-Shatnawi',
    },
  },
  {
    id: 'criminal',
    number: '03',
    title: {
      ar: 'القضايا الجزائية والجرائم الإلكترونية',
      en: 'Criminal Defense & Cybercrime',
    },
    subtitle: {
      ar: 'دفاع جزائي · ابتزاز إلكتروني · ذم وقدح',
      en: 'Criminal Defense · Cyber Extortion · Defamation',
    },
    description: {
      ar: 'دفاع جزائي حازم ومباشر أمام المدعي العام ومحاكم الجنايات والصلح الجزائي في القضايا الجزائية وقانون الجرائم الإلكترونية لحماية السمعة والحقوق.',
      en: 'Firm, strategic defense before Public Prosecutors and Criminal Courts under Jordanian Criminal and Cybercrime legislation.',
    },
    documentsNeeded: {
      ar: [
        'لقطات الشاشة والروابط الموثقة قبل الحذف',
        'مذكرة التبليغ أو رقم الشكوى لدى المدعي العام',
        'التقارير الفنية أو محاضر الضبط الأولية',
      ],
      en: [
        'Preserved screenshots and URLs of digital evidence',
        'Prosecutor summons or police complaint reference number',
        'Technical forensic reports or initial investigation records',
      ],
    },
    leadLawyer: {
      ar: 'المحامي أحمد سليم الخولي',
      en: 'Attorney Ahmad Saleem Al-Khouli',
    },
  },
  {
    id: 'commercial',
    number: '04',
    title: {
      ar: 'القضايا التجارية وإعداد وصياغة العقود',
      en: 'Commercial Law & Contract Drafting',
    },
    subtitle: {
      ar: 'تأسيس شركات · صياغة العقود والاتفاقيات · نزاعات الشركاء',
      en: 'Company Setup · Contract Drafting · Partner Disputes',
    },
    description: {
      ar: 'صياغة عقود تجارية واستثمارية محكمة وتأسيس شركات، وحل نزاعات الشركاء لحماية الكيانات التجارية وفق قانون الشركات والتجارة الأردني.',
      en: 'Airtight commercial and corporate agreements, company formation, and decisive resolution of commercial and shareholder disputes.',
    },
    documentsNeeded: {
      ar: [
        'سجل الشركة التجاري وعقد التأسيس والنظام الأساسي',
        'العقود التجارية أو الفواتير وكشوف الحساب',
        'محاضر اجتماعات الهيئة العامة أو مجلس الإدارة',
      ],
      en: [
        'Commercial registry certificate and Articles of Association',
        'Commercial agreements, invoices, and account statements',
        'Board or General Assembly meeting minutes',
      ],
    },
    leadLawyer: {
      ar: 'المحامية ليالي خريسات',
      en: 'Attorney Layali Khreisat',
    },
  },
  {
    id: 'labor',
    number: '05',
    title: {
      ar: 'القضايا العمالية وحقوق الموظفين',
      en: 'Labor Law & Employee Rights',
    },
    subtitle: {
      ar: 'فصل تعسفي · مستحقات عمالية · إصابات عمل',
      en: 'Wrongful Termination · End-of-Service · Work Injuries',
    },
    description: {
      ar: 'المطالبة بالمستحقات العمالية وحماية الحقوق وفق قانون العمل الأردني في قضايا الفصل التعسفي، الإجازات، العمل الإضافي، والضمان الاجتماعي.',
      en: 'Advocating employee rights and corporate labor compliance under Jordanian Labor Law including wrongful dismissal and Social Security claims.',
    },
    documentsNeeded: {
      ar: [
        'عقد العمل أو كتاب التعيين وإنهاء الخدمات',
        'كشف راتب وكشف اشتراكات الضمان الاجتماعي',
        'المراسلات الرسمية أو الإنذارات الوظيفية',
      ],
      en: [
        'Employment contract and termination notice',
        'Salary slips and Social Security contribution statement',
        'Official HR warnings or internal correspondence',
      ],
    },
    leadLawyer: {
      ar: 'المحامي أحمد سليم الخولي',
      en: 'Attorney Ahmad Saleem Al-Khouli',
    },
  },
  {
    id: 'administrative',
    number: '06',
    title: {
      ar: 'القضايا الإدارية ودوائر التنفيذ',
      en: 'Administrative Law & Execution',
    },
    subtitle: {
      ar: 'قرارات إدارية · تنفيذ سندات · حجز ومنع سفر',
      en: 'Administrative Appeals · Debt Execution · Travel Bans',
    },
    description: {
      ar: 'الطعن بالقرارات الإدارية أمام المحكمة الإدارية وإدارة ملفات دوائر التنفيذ بدقة عبر الحجز التحفظي وتحصيل السندات التنفيذية.',
      en: 'Challenging administrative decisions before the Administrative Court and managing Execution Department files with precision.',
    },
    documentsNeeded: {
      ar: [
        'القرار الإداري المطعون فيه وتاريخ التبليغ (مهلة 60 يوماً)',
        'رقم الدعوى التنفيذية والسند التنفيذي',
        'كشف أموال أو إشعارات الحجز ومنع السفر',
      ],
      en: [
        'Challenged administrative decision and notification date (60-day window)',
        'Execution case number and enforceable instrument',
        'Asset disclosure or attachment/travel ban notices',
      ],
    },
    leadLawyer: {
      ar: 'المحامي رضوان علي بطاينة',
      en: 'Attorney Radwan Ali Bataineh',
    },
  },
  {
    id: 'arbitration',
    number: '07',
    title: {
      ar: 'التحكيم والوساطة وحل النزاعات',
      en: 'Arbitration, Mediation & Dispute Resolution',
    },
    subtitle: {
      ar: 'تحكيم تجاري · وساطة قانونية · تسوية ودية مُلزمة',
      en: 'Commercial Arbitration · Legal Mediation · Binding Settlements',
    },
    description: {
      ar: 'إدارة إجراءات التحكيم وفق قانون التحكيم الأردني والوساطة القانونية وصياغة اتفاقيات التسوية والصلح المُلزمة بكفاءة وسرعة.',
      en: 'Managing arbitration under Jordanian Arbitration Law, legal mediation, and binding settlement agreements efficiently.',
    },
    documentsNeeded: {
      ar: [
        'العقد المتضمن شرط التحكيم أو مشارطة التحكيم',
        'ملخص المطالبات والمستندات الهندسية أو المالية',
        'عروض التسوية السابقة والمراسلات',
      ],
      en: [
        'Contract containing the arbitration clause or submission agreement',
        'Claim summary and supporting financial/technical reports',
        'Prior settlement proposals and formal notices',
      ],
    },
    leadLawyer: {
      ar: 'المحامي رضوان علي بطاينة',
      en: 'Attorney Radwan Ali Bataineh',
    },
  },
];

// Team members displayed beneath the standalone Founder showcase (personal phones removed)
export const TEAM_LAWYERS: LawyerProfile[] = [
  {
    id: 'ahmad',
    number: '01',
    initials: { ar: 'أ.خ', en: 'A.K' },
    name: {
      ar: 'المحامي أحمد سليم الخولي',
      en: 'Attorney Ahmad Saleem Al-Khouli',
    },
    role: {
      ar: 'محامي في فريق شركة الرضوان',
      en: 'Attorney — RB Legal Team',
    },
    bio: {
      ar: 'يتولى الدفاع في القضايا الجزائية والجرائم الإلكترونية والنزاعات العمالية والحقوقية بمهنية وانضباط تام لضمان حماية حقوق الموكلين.',
      en: 'Handles criminal defense, cybercrime litigation, and labor disputes with thorough procedural precision.',
    },
    focusAreas: {
      ar: ['القضايا الجزائية', 'الجرائم الإلكترونية', 'القضايا العمالية'],
      en: ['Criminal Defense', 'Cybercrime', 'Labor Disputes'],
    },
  },
  {
    id: 'najwa',
    number: '02',
    initials: { ar: 'ن.ش', en: 'N.S' },
    name: {
      ar: 'المحامية نجوى الشطناوي',
      en: 'Attorney Najwa Al-Shatnawi',
    },
    role: {
      ar: 'محامية في فريق شركة الرضوان',
      en: 'Attorney — RB Legal Team',
    },
    bio: {
      ar: 'تتولى القضايا الشرعية والأحوال الشخصية والتركات والاستشارات الأسرية بسرية تامة وعناية مهنية رفيعة.',
      en: 'Focuses on Sharia litigation, family law, alimony, custody, and inheritance proceedings with complete discretion.',
    },
    focusAreas: {
      ar: ['القضايا الشرعية', 'الأحوال الشخصية', 'المواريث والتركات'],
      en: ['Sharia Law', 'Personal Status', 'Inheritance'],
    },
  },
  {
    id: 'layali',
    number: '03',
    initials: { ar: 'ل.خ', en: 'L.K' },
    name: {
      ar: 'المحامية ليالي خريسات',
      en: 'Attorney Layali Khreisat',
    },
    role: {
      ar: 'محامية في فريق شركة الرضوان',
      en: 'Attorney — RB Legal Team',
    },
    bio: {
      ar: 'متخصصة في إعداد وصياغة العقود والاتفاقيات وتأسيس الشركات وتسوية النزاعات التجارية.',
      en: 'Specializes in contract drafting, corporate formation, and commercial advisory.',
    },
    focusAreas: {
      ar: ['صياغة العقود', 'القضايا التجارية', 'تأسيس الشركات'],
      en: ['Contract Drafting', 'Commercial Law', 'Corporate Setup'],
    },
  },
  {
    id: 'ghufran',
    number: '04',
    initials: { ar: 'غ.خ', en: 'G.K' },
    name: {
      ar: 'المحامية غفران الخطيب',
      en: 'Attorney Ghufran Al-Khatib',
    },
    role: {
      ar: 'محامية في فريق شركة الرضوان',
      en: 'Attorney — RB Legal Team',
    },
    bio: {
      ar: 'تُعنى بإعداد المذكرات القانونية، متابعة الدعاوى المدنية، ودعم التحليل القانوني وصياغة العقود والاستشارات.',
      en: 'Focuses on legal memoranda, civil litigation follow-up, contract review, and legal research.',
    },
    focusAreas: {
      ar: ['المذكرات القانونية', 'القضايا المدنية', 'الاستشارات والعقود'],
      en: ['Legal Memoranda', 'Civil Litigation', 'Contracts & Advisory'],
    },
  },
];

export const WHY_US_PILLARS = [
  {
    num: '01',
    title: {
      ar: 'قيادة مباشرة من المؤسس والمدير العام',
      en: 'Direct Founder & Managing Director Oversight',
    },
    body: {
      ar: 'يشرف المحامي رضوان علي بطاينة شخصياً على التوجه القانوني والاستراتيجي للملفات والتحكيم، بما يضمن جودة الصياغة وقوة المرافعة.',
      en: 'Attorney Radwan Ali Bataineh directly guides the firm’s legal strategy and oversight across litigation and arbitration.',
    },
  },
  {
    num: '02',
    title: {
      ar: 'حضور مؤسسي في عمّان وإربد',
      en: 'Institutional Presence in Amman & Irbid',
    },
    body: {
      ar: 'نخدم الموكلين والشركات من خلال فرع عمّان (شارع مكة — مجمع داوود) وفرع إربد (شارع الثلاثين — إشارة الضباط) بسرعة استجابة عالية.',
      en: 'Serving clients and enterprises through our Amman (Mecca St — Dawood Complex) and Irbid (30th St — Al-Dubbat Signal) offices.',
    },
  },
  {
    num: '03',
    title: {
      ar: 'صياغة محكمة وسرية مهنية مطلقة',
      en: 'Rigorous Drafting & Absolute Confidentiality',
    },
    body: {
      ar: 'تُدار كافة ملفات الموكلين ومستنداتهم وفق ضوابط خصوصية وأمان صارمة، مع توثيق دقيق لكل مرحلة قضائية أو تحكيمية.',
      en: 'Every client file and contract is handled under strict confidentiality protocols and structured procedural tracking.',
    },
  },
  {
    num: '04',
    title: {
      ar: 'وضوح استشاري وحجز ميسّر',
      en: 'Clear Consultations & Seamless Scheduling',
    },
    body: {
      ar: 'احجز موعد استشارتك بسهولة في فرع عمّان أو إربد أو عن بُعد، ليتم تأكيد الموعد رسمياً من المكتب في أسرع وقت.',
      en: 'Request an in-person consultation in Amman or Irbid, or online, with prompt confirmation directly from our office.',
    },
  },
];

export const TESTIMONIALS: TestimonialItem[] = [
  {
    id: 't1',
    clientName: {
      ar: 'م. عمر الخطيب',
      en: 'Eng. Omar Al-Khatib',
    },
    caseType: {
      ar: 'نزاع عقود وتحصيل مستحقات',
      en: 'Contract Dispute & Receivables Recovery',
    },
    quote: {
      ar: 'الإدارة القانونية الاحترافية بقيادة المحامي رضوان علي بطاينة منحتنا وضوحاً وثقة منذ الجلسة الأولى حتى استرداد كامل حقوقنا.',
      en: 'Professional legal leadership under Attorney Radwan Ali Bataineh gave us clarity and confidence until our rights were fully recovered.',
    },
    outcome: {
      ar: 'تسوية موثقة وتحصيل الحقوق',
      en: 'Formal settlement & recovery',
    },
  },
  {
    id: 't2',
    clientName: {
      ar: 'السيدة رنا بني هاني',
      en: 'Mrs. Rana Bani Hani',
    },
    caseType: {
      ar: 'قضية أحوال شخصية وحضانة',
      en: 'Sharia Custody & Alimony',
    },
    quote: {
      ar: 'تعاملت شركة الرضوان للقانون والتحكيم مع ملفنا بأقصى درجات الخصوصية والالتزام حتى صدور الحكم وتنفيذه.',
      en: 'Al-Radwan Law & Arbitration handled our family case with complete confidentiality and dedication through final execution.',
    },
    outcome: {
      ar: 'حكم وتنفيذ منضبط',
      en: 'Enforceable ruling achieved',
    },
  },
  {
    id: 't3',
    clientName: {
      ar: 'شركة الرواد للخدمات اللوجستية',
      en: 'Al-Rowad Logistics Co.',
    },
    caseType: {
      ar: 'صياغة عقود وتسوية نزاعات',
      en: 'Contract Drafting & Dispute Settlement',
    },
    quote: {
      ar: 'اعتمدنا على شركة الرضوان لصياغة اتفاقياتنا التجارية وتسوية نزاع عمالي، وكانت الدقة والاحترافية عنوان كل خطوة.',
      en: 'We relied on Al-Radwan for our commercial agreements and labor dispute resolution with precision at every step.',
    },
    outcome: {
      ar: 'عقود محكمة وتسوية ودية',
      en: 'Airtight contracts & amicable settlement',
    },
  },
];

export const DEFAULT_PUBLICATIONS: FirmPublication[] = [
  {
    id: 'pub-1',
    slug: 'arbitration-clause-drafting-jordan',
    category: 'analysis',
    titleAr: 'الضوابط العملية لصياغة شرط التحكيم في العقود التجارية الأردنية',
    titleEn: 'Practical Standards for Drafting Arbitration Clauses in Jordanian Commercial Contracts',
    summaryAr:
      'تحليل قانوني يقدمه المحامي رضوان علي بطاينة حول تجنب بطلان شرط التحكيم وضمان قابلية تنفيذ قرار التحكيم وفق قانون التحكيم الأردني.',
    summaryEn:
      'A legal analysis by Attorney Radwan Ali Bataineh on avoiding defective arbitration clauses and ensuring enforceable awards under Jordanian Arbitration Law.',
    contentAr:
      'يمثل شرط التحكيم حجر الزاوية في حماية العقود التجارية والاستثمارية من إطالة أمد التقاضي، شريطة صياغته بوضوح يحدد نطاق النزاعات الخاضعة للتحكيم، ومقر التحكيم، والقانون الواجب التطبيق، وآلية تشكيل هيئة التحكيم.\n\nيوضح المحامي رضوان علي بطاينة أن الكثير من النزاعات الإجرائية تنشأ عن عبارات فضفاضة أو متناقضة تجمع بين اختصاص القضاء النظامي والتحكيم في البند ذاته. ولذلك ينبغي في عقود المقاولات والشراكات والتوريد التأكد من أهلية الموقّعين وصلاحيتهم الصريحة في الاتفاق على التحكيم، وتحديد الجهة المختصة بتعيين المحكمين عند تعذر الاتفاق.\n\nكما يُنصح بتضمين العقود آلية واضحة للإخطار المسبق والوساطة الزمنية المحددة قبل اللجوء للتحكيم، بما يصون مصالح الأطراف ويختصر كلفة النزاع.',
    authorName: 'المحامي رضوان علي بطاينة',
    publishedAt: '2026-11-15',
    featured: true,
    status: 'published',
    seoKeywords: ['التحكيم في الأردن', 'المحامي رضوان البطاينة', 'صياغة العقود التجارية', 'شركة الرضوان للقانون والتحكيم'],
    createdAt: '2026-11-15T10:00:00.000Z',
    updatedAt: '2026-11-15T10:00:00.000Z',
  },
  {
    id: 'pub-2',
    slug: 'administrative-appeal-deadlines-jordan',
    category: 'article',
    titleAr: 'مواعيد الطعن بالقرارات الإدارية أمام المحكمة الإدارية في الأردن',
    titleEn: 'Statutory Deadlines for Challenging Administrative Decisions in Jordan',
    summaryAr:
      'قراءة إجرائية في أهمية التقيد بمهلة الستين يوماً وحساب بدء السريان من تاريخ التبليغ أو العلم اليقيني بالقرار الإداري.',
    summaryEn:
      'A procedural overview on complying with the 60-day statutory window before the Jordanian Administrative Court.',
    contentAr:
      'تُعد المواعيد الإجرائية في الدعاوى الإدارية من النظام العام، ويترتب على فواتها رد الدعوى شكلاً دون الخوض في موضوعها.\n\nيبين المحامي رضوان علي بطاينة أهمية التوثيق الفوري لتاريخ تبليغ القرار الإداري أو تاريخ العلم اليقيني به، ومراجعة التظلم الإداري ومهلته القانونية عند وجوبه أو جوازه، قبل إعداد لائحة الطعن أمام المحكمة الإدارية.',
    authorName: 'المحامي رضوان علي بطاينة',
    publishedAt: '2026-11-08',
    featured: false,
    status: 'published',
    seoKeywords: ['القضاء الإداري الأردني', 'المحامي رضوان البطاينة', 'RB LEGAL'],
    createdAt: '2026-11-08T09:00:00.000Z',
    updatedAt: '2026-11-08T09:00:00.000Z',
  },
  {
    id: 'pub-3',
    slug: 'rb-legal-amman-irbid-expansion',
    category: 'news',
    titleAr: 'انطلاق الهوية المؤسسية الجديدة لشركة الرضوان للقانون والتحكيم (RB LEGAL) في عمّان وإربد',
    titleEn: 'Launch of Al-Radwan Law & Arbitration (RB LEGAL) Unified Presence in Amman & Irbid',
    summaryAr:
      'توسيع نطاق الخدمات القانونية والتحكيمية بقيادة المؤسس والمدير العام المحامي رضوان علي بطاينة عبر فرعي شارع مكة في عمّان وشارع الثلاثين في إربد.',
    summaryEn:
      'Expanding integrated legal and arbitration services under Founder & Managing Director Radwan Ali Bataineh across Amman and Irbid.',
    contentAr:
      'أعلنت شركة الرضوان للقانون والتحكيم (RB LEGAL) عن اعتماد هويتها المؤسسية المطوّرة ومنظومة العمل القانونية المتكاملة لخدمة الأفراد والشركات في عمّان (شارع مكة — مجمع داوود) وإربد (شارع الثلاثين — إشارة الضباط) برقم تواصل موحد 0796251902.',
    authorName: 'المحامي رضوان علي بطاينة',
    mediaOutlet: 'بيان مؤسسي — RB LEGAL',
    publishedAt: '2026-11-20',
    featured: false,
    status: 'published',
    seoKeywords: ['شركة الرضوان للقانون والتحكيم', 'محامي في عمان', 'محامي في إربد', 'RB LEGAL'],
    createdAt: '2026-11-20T11:00:00.000Z',
    updatedAt: '2026-11-20T11:00:00.000Z',
  },
];

export const UI_COPY = {
  brandShort: {
    ar: 'شركة الرضوان للقانون والتحكيم',
    en: 'AL-RADWAN LAW & ARBITRATION',
  },
  brandAbbr: 'RB LEGAL',
  brandFull: {
    ar: 'شركة الرضوان للقانون والتحكيم — RB LEGAL',
    en: 'AL-RADWAN LAW & ARBITRATION — RB LEGAL',
  },
  slogan: {
    ar: 'حقك… مسؤوليتنا',
    en: 'Your Right... Our Responsibility',
  },
  closingMotto: {
    ar: 'معاً نحو العدالة والحق.',
    en: 'Together Towards Justice and Truth.',
  },
  locationText: {
    ar: 'عمّان (شارع مكة) · إربد (شارع الثلاثين)',
    en: 'Amman (Mecca St) · Irbid (30th St)',
  },
  nav: {
    founder: { ar: 'المؤسس', en: 'The Founder' },
    about: { ar: 'الرؤية والقيادة', en: 'Leadership' },
    specialties: { ar: 'المجالات القانونية', en: 'Practice Areas' },
    team: { ar: 'فريق المحامين', en: 'Legal Team' },
    media: { ar: 'المقالات والإعلام', en: 'Articles & Media' },
    contact: { ar: 'الفروع والتواصل', en: 'Branches & Contact' },
  },
  hero: {
    headline: {
      ar: 'التمثيل القانوني والتحكيم بمستوى المؤسسات الدولية',
      en: 'Authoritative Legal Advocacy & Arbitration at an International Standard',
    },
    subheadline: {
      ar: 'بقيادة المؤسس والمدير العام المحامي رضوان علي بطاينة — ماجستير علوم سياسية وعلاقات دولية — نقف مع موكلينا من الأفراد والشركات في عمّان وإربد بقوة القانون وهيبة التمثيل.',
      en: 'Led by Founder & Managing Director Attorney Radwan Ali Bataineh — Master’s in Political Science & International Relations — delivering commanding representation across Amman and Irbid.',
    },
    ctaPrimary: {
      ar: 'طلب استشارة قانونية',
      en: 'Request Legal Consultation',
    },
    ctaCv: {
      ar: 'السيرة الذاتية للمؤسس',
      en: 'Founder Biography & CV',
    },
  },
  stats: [
    {
      value: 'RB LEGAL',
      valueEn: 'RB LEGAL',
      label: { ar: 'هوية قانونية وتحكيمية راسخة', en: 'Established Law & Arbitration Brand' },
    },
    {
      value: 'عمّان · إربد',
      valueEn: 'Amman · Irbid',
      label: { ar: 'مكتبان لخدمة الموكلين والشركات', en: 'Dual Offices Across Jordan' },
    },
    {
      value: '07',
      valueEn: '07',
      label: { ar: 'مجالات تقاضٍ وتحكيم متخصصة', en: 'Core Practice & Arbitration Areas' },
    },
    {
      value: '0796251902',
      valueEn: '0796251902',
      label: { ar: 'رقم المكتب الرسمي الموحد', en: 'Official Direct Firm Line' },
    },
  ],
};
