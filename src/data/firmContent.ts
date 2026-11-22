import type { Language, SpecialtyId } from '../types/legal.js';

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
  isPartner?: boolean;
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

export const ASSET_IMAGES = {
  radwanPortrait: '/assets/aistudio/1795063744003_971714c9.jpg',
  irbidOffice: '/src/assets/images/irbid_office_clean_1794914147150.jpg',
};

export const FIRM_CONTACT = {
  phoneDisplay: '0796251902',
  phoneHref: 'tel:+962796251902',
  addressShort: {
    ar: 'إربد – الشارع الثلاثين',
    en: 'Irbid – 30th Street',
  },
  addressDetailed: {
    ar: 'إربد – الشارع الثلاثين (بجانب نادي الضباط – الطابق الثاني)',
    en: 'Irbid – 30th Street (next to Officers Club – 2nd Floor)',
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
      ar: 'حل النزاعات والوساطة القانونية',
      en: 'Dispute Resolution & Mediation',
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
      ar: 'نقف معك بثبات أمام محاكم الصلح والبداية والاستئناف والتمييز لحماية أموالك وعقاراتك وتحصيل حقوقك المالية والتعويض العادل دون تهاون.',
      en: 'Standing firmly with you before Magistrate, First Instance, Appeals, and Cassation courts to safeguard your property, receivables, and rightful compensation.',
    },
    documentsNeeded: {
      ar: [
        'الكمبيالات أو الشيكات البنكية وورقة الاعتراض',
        'سندات التسجيل العقاري أو عقود الإيجار',
        'الإنذارات العدلية والمراسلات الموثقة',
      ],
      en: [
        'Promissory notes, returned checks, and bank protest memos',
        'Land registry title deeds (Kushan) or lease contracts',
        'Notarized legal notices and documented correspondence',
      ],
    },
    leadLawyer: {
      ar: 'المحامي رضوان علي البطاينة',
      en: 'Attorney Radwan Ali Al-Bataineh',
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
      ar: 'نصون خصوصية أسرتك ونحمل قضيتك بأمانة أمام المحاكم الشرعية في قضايا النفقة، الحضانة، الشقاق والنزاع، وتقسيم التركات بإنصاف وطمأنينة.',
      en: 'Protecting your family privacy with integrity before Sharia courts across alimony, child custody, marital disputes, and fair estate distribution.',
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
      ar: 'دفاع قانوني حازم وسريع أمام المدعي العام ومحاكم الجنايات والصلح الجزائي لحماية سمعتك وحريتك في القضايا الجزائية وقانون الجرائم الإلكترونية.',
      en: 'Steadfast, responsive defense before Public Prosecutors and Criminal Courts safeguarding your reputation and rights under Criminal and Cybercrime laws.',
    },
    documentsNeeded: {
      ar: [
        'لقطات الشاشة والروابط الموثقة قبل الحذف',
        'مذكرة التبليغ أو رقم الشكوى لدى المدعي العام',
        'أي تقارير فنية أو محاضر ضبط أولية',
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
      ar: 'نحصّن أعمالك واستثماراتك بعقود محكمة الصياغة وتأسيس قانوني سليم للشركات، ونحمي مصالحك التجارية من أي ثغرات أو نزاعات مستقبلية.',
      en: 'Fortifying your business with airtight contracts, sound corporate formation, and decisive resolution of commercial and shareholder disputes.',
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
      ar: 'ندافع عن تعب السنين ومستحقات الموظفين والعمال وفق قانون العمل الأردني في قضايا الفصل التعسفي، الإجازات، العمل الإضافي، وحقوق الضمان الاجتماعي.',
      en: 'Defending hard-earned employee rights and employer compliance under Jordanian Labor Law including wrongful dismissal, unpaid leave, and Social Security claims.',
    },
    documentsNeeded: {
      ar: [
        'عقد العمل أو كتاب التعيين وإنهاء الخدمات',
        'كشف راتب وكشف اشتراكات الضمان الاجتماعي',
        'أي مراسلات رسمية أو إنذارات وظيفية',
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
      ar: 'الطعن بالقرارات الإدارية أمام المحكمة الإدارية وإدارة ملفات دوائر التنفيذ بدقة لرفع الظلم واسترداد الحقوق عبر الحجز التحفظي والتسويات العادلة.',
      en: 'Challenging administrative decisions before the Administrative Court and managing Execution Department files with precision and speed.',
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
      ar: 'المحامي رضوان علي البطاينة',
      en: 'Attorney Radwan Ali Al-Bataineh',
    },
  },
  {
    id: 'arbitration',
    number: '07',
    title: {
      ar: 'حل النزاعات والتحكيم والوساطة القانونية',
      en: 'Dispute Resolution, Arbitration & Mediation',
    },
    subtitle: {
      ar: 'تحكيم تجاري · وساطة قانونية · تسوية ودية مُلزمة',
      en: 'Commercial Arbitration · Legal Mediation · Binding Settlements',
    },
    description: {
      ar: 'نسعى لحل النزاعات بحكمة وتوازن عبر التحكيم والوساطة القانونية وصياغة اتفاقيات صلح مُلزمة تصون حقوقك وتختصر الوقت والجهد.',
      en: 'Resolving disputes wisely through arbitration, legal mediation, and binding settlement agreements that protect your interests while saving time.',
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
      ar: 'المحامي رضوان علي البطاينة',
      en: 'Attorney Radwan Ali Al-Bataineh',
    },
  },
];

export const LAWYERS: LawyerProfile[] = [
  {
    id: 'radwan',
    number: '01',
    isDirector: true,
    initials: {
      ar: 'ر.ب',
      en: 'R.B',
    },
    name: {
      ar: 'المحامي رضوان علي البطاينة',
      en: 'Attorney Radwan Ali Al-Bataineh',
    },
    role: {
      ar: 'مؤسس الشركة والمدير',
      en: 'Founder & Director',
    },
    credential: {
      ar: 'ماجستير في العلوم السياسية والعلاقات الدولية',
      en: "Master's in Political Science & International Relations",
    },
    bio: {
      ar: 'يقود فريق شركة الرضوان برؤية قانونية واسعة وإشراف مباشر على الملفات الكبرى والتحكيم والتمثيل أمام المحاكم، لتقديم حلول آمنة وموثوقة تحمي مصالح الموكلين وتمنحهم الطمأنينة.',
      en: 'Leads Al-Radwan Law Firm with broad legal insight and direct oversight across major litigation, arbitration, and client advocacy to deliver secure, reassuring solutions.',
    },
    focusAreas: {
      ar: ['التمثيل أمام المحاكم', 'حل النزاعات والتحكيم', 'القضايا المدنية والإدارية'],
      en: ['Court Representation', 'Arbitration & Mediation', 'Civil & Administrative'],
    },
  },
  {
    id: 'ahmad',
    number: '02',
    isPartner: true,
    initials: {
      ar: 'أ.خ',
      en: 'A.K',
    },
    name: {
      ar: 'المحامي أحمد سليم الخولي',
      en: 'Attorney Ahmad Saleem Al-Khouli',
    },
    role: {
      ar: 'شريك في الشركة',
      en: 'Partner',
    },
    bio: {
      ar: 'شريك في قيادة العمل القانوني بالشركة، يتولى الدفاع في القضايا الجزائية والجرائم الإلكترونية والنزاعات العمالية والحقوقية بحزم ومهنية عالية لضمان حماية حقوق الموكلين.',
      en: 'Partner helping lead the firm’s advocacy across criminal defense, cybercrime, and employment litigation with steadfast dedication to client rights.',
    },
    focusAreas: {
      ar: ['القضايا الجنائية والجزائية', 'الجرائم الإلكترونية', 'القضايا العمالية'],
      en: ['Criminal Defense', 'Cybercrime Law', 'Labor Disputes'],
    },
  },
  {
    id: 'najwa',
    number: '03',
    initials: {
      ar: 'ن.ش',
      en: 'N.S',
    },
    name: {
      ar: 'المحامية نجوى الشطناوي',
      en: 'Attorney Najwa Al-Shatnawi',
    },
    role: {
      ar: 'محامية في فريق شركة الرضوان',
      en: 'Attorney — Al-Radwan Legal Team',
    },
    bio: {
      ar: 'تقف إلى جانب الموكلين بسرية وأمانة في القضايا الشرعية والأحوال الشخصية والتركات والاستشارات الأسرية، مع حرص صادق على تحقيق الأمان القانوني للأسرة.',
      en: 'Advocates with discretion and care in Sharia, personal status, custody, alimony, and inheritance matters to ensure lasting family security.',
    },
    focusAreas: {
      ar: ['القضايا الشرعية', 'الأحوال الشخصية والحضانة', 'المواريث والتركات'],
      en: ['Sharia Litigation', 'Family & Custody', 'Inheritance & Estates'],
    },
  },
  {
    id: 'layali',
    number: '04',
    initials: {
      ar: 'ل.خ',
      en: 'L.K',
    },
    name: {
      ar: 'المحامية ليالي خريسات',
      en: 'Attorney Layali Khreisat',
    },
    role: {
      ar: 'محامية في فريق شركة الرضوان',
      en: 'Attorney — Al-Radwan Legal Team',
    },
    bio: {
      ar: 'متخصصة في إعداد وصياغة العقود والاتفاقيات، تأسيس الشركات، وتسوية النزاعات التجارية، بما يضمن حماية مصالح الأفراد والشركات بصياغة قانونية رصينة.',
      en: 'Specializes in drafting contracts and agreements, corporate formation, and commercial dispute resolution to protect individual and business interests.',
    },
    focusAreas: {
      ar: ['إعداد وصياغة العقود', 'القضايا التجارية والشركات', 'الاستشارات القانونية'],
      en: ['Contract Drafting', 'Commercial & Corporate', 'Legal Consultations'],
    },
  },
];

export const WHY_US_PILLARS = [
  {
    num: '01',
    title: {
      ar: 'قضيتك أمانة وليست مجرد ملف',
      en: 'Your Case Is a Sacred Trust',
    },
    body: {
      ar: 'نصغي إليك بصدق قبل كل إجراء، ونقف إلى جانبك بثبات حتى تشعر بالأمان ويعود حقك كاملاً دون قلق.',
      en: 'We listen to you first with genuine care and stand firmly beside you until justice and peace of mind are restored.',
    },
  },
  {
    num: '02',
    title: {
      ar: 'استشارة أولية مجانية بالكامل',
      en: '100% Free Initial Consultation',
    },
    body: {
      ar: 'لأن الوصول للعدالة لا ينبغي أن يبدأ بعائق مالي، نقدم استشارتك القانونية الأولى مجاناً سواء حضورياً في إربد أو أونلاين.',
      en: 'Because seeking justice should never start with a barrier, your initial consultation is completely free in person or online.',
    },
  },
  {
    num: '03',
    title: {
      ar: 'فريق واحد بإخلاص مشترك',
      en: 'One Dedicated Legal Team',
    },
    body: {
      ar: 'بقيادة المدير المحامي رضوان علي البطاينة والشريك المحامي أحمد سليم الخولي وفريق المحاميات المتخصصات، تُدرس قضيتك من كل زاوية.',
      en: 'Led by Director Radwan Ali Al-Bataineh, Partner Ahmad Saleem Al-Khouli, and our specialist attorneys reviewing every angle.',
    },
  },
  {
    num: '04',
    title: {
      ar: 'وضوح تام ومساعد ذكي جاهز دائماً',
      en: 'Full Transparency & 24/7 AI Intake',
    },
    body: {
      ar: 'نرتب وقائع قضيتك ومستنداتك مسبقاً عبر المساعد القانوني الذكي «الصافي» لتبدأ خطوتك القانونية بثقة واطمئنان.',
      en: 'Organize your case facts anytime through our Al-Safi AI assistant so you enter your consultation fully prepared.',
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
      ar: 'قضية تجارية وتحصيل شيكات · إربد',
      en: 'Commercial & Bounced Checks · Irbid',
    },
    quote: {
      ar: 'شعرت منذ اللحظة الأولى أن قضيتي بين أيدٍ أمينة. فريق الأستاذ رضوان علي البطاينة تعامل مع ملفنا بصدق ومهنية حتى استرددنا كامل حقوقنا بتسوية موثقة.',
      en: 'From the first moment I felt my case was in trustworthy hands. Attorney Radwan Ali Al-Bataineh’s team handled our file with sincerity until our rights were fully recovered.',
    },
    outcome: {
      ar: 'تحصيل كامل الحقوق بتسوية موثقة',
      en: 'Full rights recovered via formal settlement',
    },
  },
  {
    id: 't2',
    clientName: {
      ar: 'السيدة رنا بني هاني',
      en: 'Mrs. Rana Bani Hani',
    },
    caseType: {
      ar: 'أحوال شخصية ونفقة وحضانة',
      en: 'Sharia Custody & Alimony',
    },
    quote: {
      ar: 'كنت أخشى ضياع حقي وحق أطفالي، لكن المحامية نجوى الشطناوي وفريق شركة الرضوان أنصتوا لي بإنسانية وتابعوا الدعوى بثبات حتى صدر الحكم لصالحنا.',
      en: 'I feared losing my children’s rights, yet Attorney Najwa Al-Shatnawi and the Al-Radwan team listened with empathy and stood firm until the ruling was issued in our favor.',
    },
    outcome: {
      ar: 'حكم نفقة وحضانة وتنفيذ فوري',
      en: 'Full custody & enforceable alimony order',
    },
  },
  {
    id: 't3',
    clientName: {
      ar: 'شركة الرواد للخدمات اللوجستية',
      en: 'Al-Rowad Logistics Co.',
    },
    caseType: {
      ar: 'صياغة عقود وحل نزاعات عمالية',
      en: 'Contracts & Labor Dispute Resolution',
    },
    quote: {
      ar: 'استعنا بشركة الرضوان بقيادة الأستاذ رضوان والشريك الأستاذ أحمد سليم الخولي لصياغة عقودنا وحل نزاع عمالي ودياً. الأمانة والوضوح كانتا عنوان التعامل.',
      en: 'We turned to Al-Radwan Law Firm, led by Attorney Radwan and Partner Ahmad Saleem Al-Khouli, to draft our contracts and settle a labor dispute smoothly with complete integrity.',
    },
    outcome: {
      ar: 'حل نزاعات ودية وصياغة عقود محكمة',
      en: 'Amicable dispute settlement & airtight contracts',
    },
  },
];

export const UI_COPY = {
  brandShort: {
    ar: 'شركة الرضوان للمحاماة',
    en: 'Al-Radwan Law Firm',
  },
  brandFull: {
    ar: 'شركة الرضوان للتحكيم والمحاماة والاستشارات القانونية',
    en: 'Al-Radwan Arbitration, Law Firm & Legal Consultations',
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
    ar: 'إربد – الشارع الثلاثين (بجانب نادي الضباط)',
    en: 'Irbid – 30th Street (next to Officers Club)',
  },
  nav: {
    about: { ar: 'من نحن', en: 'About Us' },
    specialties: { ar: 'خدماتنا', en: 'Services' },
    team: { ar: 'فريق العمل', en: 'Our Team' },
    contact: { ar: 'تواصل معنا', en: 'Contact' },
  },
  hero: {
    headline: {
      ar: 'حين يكون حقك على المحك، تجد في شركة الرضوان سنداً أميناً وخبرة تُطمئن القلب',
      en: 'When Your Rights Are on the Line, Al-Radwan Stands as Your Trusted Shield & Peace of Mind',
    },
    subheadline: {
      ar: 'حقك… مسؤوليتنا. خلف كل قضية إنسان يبحث عن الأمان، ولهذا نقف إلى جانبك بصدق وثبات — واستشارتك القانونية الأولى مجانية بالكامل.',
      en: 'Your Right... Our Responsibility. Behind every case is a person seeking security; we stand beside you with integrity — starting with a 100% free consultation.',
    },
    ctaPrimary: {
      ar: 'احجز استشارتك المجانية الآن',
      en: 'Book Free Consultation',
    },
    ctaAi: {
      ar: 'تحدث مع المساعد القانوني الذكي',
      en: 'Talk to AI Legal Assistant',
    },
    lawyerPortal: {
      ar: 'لوحة تحكم المحامين',
      en: 'Lawyer Dashboard',
    },
  },
  stats: [
    {
      value: 'مجانية',
      valueEn: 'FREE',
      label: { ar: 'الاستشارة القانونية الأولية', en: 'Initial Legal Consultation' },
    },
    {
      value: '04',
      valueEn: '04',
      label: { ar: 'محامون يجمعهم الإخلاص لحقك', en: 'Dedicated Legal Counsel' },
    },
    {
      value: '07',
      valueEn: '07',
      label: { ar: 'تخصصات قانونية وتحكيم ووساطة', en: 'Practice & Arbitration Areas' },
    },
    {
      value: '24/7',
      valueEn: '24/7',
      label: { ar: 'مساعد قانوني ذكي يُصغي إليك', en: '24/7 Smart AI Case Intake' },
    },
  ],
};
