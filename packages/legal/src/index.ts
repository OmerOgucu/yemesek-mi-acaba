export type LegalSection = {
  heading: string;
  paragraphs: string[];
};

export type LegalDocument = {
  slug: LegalSlug;
  title: string;
  summary: string;
  updated: string;
  sections: LegalSection[];
};

export const LEGAL_SLUGS = ['kvkk', 'gizlilik', 'kullanim-kosullari', 'cerez-politikasi'] as const;

export type LegalSlug = (typeof LEGAL_SLUGS)[number];

const CONTROLLER = 'Yemesek mi acaba';
const CONTACT = 'kvkk@yemesek.local';

export const DOCUMENTS: LegalDocument[] = [
  {
    slug: 'kvkk',
    title: 'KVKK aydınlatma metni',
    summary: '6698 sayılı Kanun madde 10 kapsamındaki aydınlatma. Veri sorumlusu: Yemesek mi acaba.',
    updated: '25 Eylül 2026',
    sections: [
      {
        heading: 'Veri sorumlusu',
        paragraphs: [
          `Veri sorumlusu: ${CONTROLLER}. Bu metin yerel MVP içindir; tescilli bir şirket adresi henüz yoktur. Kişisel veri talepleri için: ${CONTACT}.`,
          'Yayına çıkmadan önce metin bir hukukçu tarafından, gerçek unvan, adres ve iletişim bilgileriyle güncellenmelidir.',
        ],
      },
      {
        heading: 'İşlenen veriler',
        paragraphs: [
          'Hesap: e-posta, görünen ad, parola özeti (düz parola saklanmaz), kayıt zamanı.',
          'Rıza kayıtları: KVKK aydınlatma kabul zamanı, kullanım koşulları kabul zamanı, varsa pazarlama açık rızasının verilme veya geri alınma zamanı.',
          'İçerik: yazdığınız şikayet başlığı ve metni, takma ad, yararlı oy. Şikayet herkese açıktır; e-postanız şikayetin yanında gösterilmez.',
          'Oturum: kısa ömürlü erişim jetonu ve sunucuda yalnızca özeti tutulan yenileme jetonu.',
          'Güvenlik: hız sınırı için IP adresi yalnızca bellekte, kısa süre tutulur; veritabanına yazılmaz.',
          'İstemediğimiz veriler: telefon, T.C. kimlik numarası, tam açık adres, ödeme bilgisi, konum.',
        ],
      },
      {
        heading: 'Amaçlar',
        paragraphs: [
          'Hesap açmak, girişi doğrulamak ve şikayet ile oyu size bağlamak.',
          'Kötülük skorunu hesaplamak ve liderlik tablosunu herkese açık göstermek.',
          'Hakaret, tehdit, kişisel veri ve kötüye kullanımı engellemek; hız sınırını uygulamak.',
          'Pazarlama iletisi yalnızca ayrıca ve isteğe bağlı verdiğiniz açık rıza varsa gönderilir. Bu MVP pazarlama postası göndermez.',
        ],
      },
      {
        heading: 'Hukuki sebepler',
        paragraphs: [
          'Hesabın kurulması ve şikayetin yayımlanması: sözleşmenin kurulması ve ifası (KVKK m.5/2-c).',
          'Kötüye kullanımın önlenmesi ve hizmetin güvenliği: meşru menfaat (KVKK m.5/2-f). Bu menfaat, ölçülü hız sınırı ve içerik denetimiyle sınırlıdır.',
          'Pazarlama: açık rıza (KVKK m.5/1). Rıza vermeden kayıt olabilirsiniz. Verdiyseniz profil ekranından geri alabilirsiniz.',
          'Aydınlatma metnini okuduğunuzu kayıt altına alırız. Aydınlatma, açık rızanın yerine geçmez; pazarlama için ayrı kutu vardır.',
        ],
      },
      {
        heading: 'Aktarım',
        paragraphs: [
          'Bu MVP veriyi yurt dışındaki bir pazarlama veya reklam ağına aktarmaz. Barındırma kendi makinenizdeki SQLite dosyasıdır.',
          'Yayın ortamına taşınırsa, barındırıcı ve e-posta hizmeti ayrıca ilan edilir. Şikayet metni siteyi açan herkese açıktır; bunu aktarım değil, sizin yayımladığınız içerik sayın.',
        ],
      },
      {
        heading: 'Saklama',
        paragraphs: [
          'Hesap verisi, siz hesabı silene kadar durur. Silince hesap, şikayetler, oylar ve yenileme jetonları silinir.',
          'Şikayetin konusu olan mekan kaydı, başkalarının şikayetleri duruyorsa kalabilir. Yalnızca sizin yazdığınız kayıtlar silinir.',
        ],
      },
      {
        heading: 'Haklarınız',
        paragraphs: [
          'KVKK madde 11: verinizin işlenip işlenmediğini öğrenme, düzeltilmesini isteme, silinmesini isteme, işlenen veriyi öğrenme.',
          'Uygulama: profil ekranında görünen adı güncelleyebilir, pazarlama rızasını kapatabilir ve hesabınızı parolanızla silebilirsiniz. Diğer talepler için ' +
            CONTACT +
            ' adresine e-posta yazın. Kimliğinizi doğrulamamız gerekebilir.',
          'Yanıt süresi Kanundaki otuz gündür. Başvurunuz reddedilirse veya süresinde cevap alamazsanız Kişisel Verileri Koruma Kuruluna şikayet hakkınız vardır.',
        ],
      },
    ],
  },
  {
    slug: 'gizlilik',
    title: 'Gizlilik politikası',
    summary: 'Hangi veriyi aldığımız, hangisini almadığımız ve şikayetin nasıl göründüğü.',
    updated: '25 Eylül 2026',
    sections: [
      {
        heading: 'Kısa hali',
        paragraphs: [
          `${CONTROLLER} bir şikayet tahtasıdır. Liderlik tablosunu herkes okur. Şikayet yazmak ve yararlı oyu vermek için hesap gerekir.`,
          'E-postanız ve parolanız yayımlanmaz. Şikayetin yanında görünen ad, sizin yazdığınız takma addır; boş bırakırsanız görünen adınız kullanılır.',
        ],
      },
      {
        heading: 'Parola',
        paragraphs: [
          'Parola bcrypt ile özetlenir. Düz metin parola veritabanında, günlükte veya istemci kodunda durmaz.',
          'Erişim jetonu kısadır. Yenileme jetonunun kendisi değil, özeti saklanır. Çıkışta veya yeniden girişte eski yenileme jetonu iptal edilir.',
        ],
      },
      {
        heading: 'Şikayet',
        paragraphs: [
          'Şikayet bir iddiadır, resmi tespit değildir. Telefon, e-posta, kimlik numarası, kapı numarası ve tehdit içeren metin reddedilir.',
          'Başka bir kişinin özel hayatını ifşa etmek kullanım koşullarına aykırıdır. Böyle bir metin yayından kaldırılabilir.',
        ],
      },
      {
        heading: 'Çocuklar',
        paragraphs: [
          'Hizmet 18 yaşından küçüklere yönelik değildir. Bilerek çocuklardan veri toplamayız.',
        ],
      },
      {
        heading: 'Güvenlik sınırı',
        paragraphs: [
          'Yerel MVP HTTP üzerinde çalışır. Herkese açık bir sunucuya alınırken TLS zorunlu olmalıdır. Jetonlar webde tarayıcı deposunda, mobilde cihazın güvenli deposunda tutulur.',
        ],
      },
    ],
  },
  {
    slug: 'kullanim-kosullari',
    title: 'Kullanım koşulları',
    summary: 'Hesabı ve şikayeti hangi kurallarla kullanacağınız.',
    updated: '25 Eylül 2026',
    sections: [
      {
        heading: 'Hizmet',
        paragraphs: [
          `${CONTROLLER}, restoranlar hakkında kullanıcı şikayetlerini listeler ve bunlardan bir kötülük skoru üretir. Skor bir mahkeme kararı, hijyen denetimi veya sağlık raporu değildir.`,
          'Listeyi okumak için hesap gerekmez. Mekan eklemek herkese açıktır. Şikayet ve yararlı oy için kayıt ve giriş gerekir.',
        ],
      },
      {
        heading: 'Hesap',
        paragraphs: [
          'Kayıtta KVKK aydınlatma metnini ve bu koşulları kabul etmeniz gerekir. Pazarlama kutusu isteğe bağlıdır ve kaydı engellemez.',
          'Hesap size aittir. Parolayı paylaşmayın. Demo hesap yalnızca yerel deneme içindir.',
        ],
      },
      {
        heading: 'İçerik kuralları',
        paragraphs: [
          'Yaşadığınızı anlatın. Kişi adı, telefon, tam adres, kimlik numarası yazmayın. Hakaret, nefret söylemi ve tehdit yasaktır.',
          'Uydurma zehirlenme iddiası veya bir işletmeyi haksız yere itibarsızlaştırma sizin sorumluluğunuzdadır. Gerçeğe aykırı içerikten doğan taleplerde yazan kişi muhataptır.',
          'Kendi şikayetinize yararlı oyu veremezsiniz.',
        ],
      },
      {
        heading: 'Kaldırma ve hesap silme',
        paragraphs: [
          'Kurallara uymayan içeriği yayından kaldırabiliriz. Hesabınızı profil ekranından silerseniz şikayetleriniz ve oylarınız da silinir.',
          'Silinen skor, kalan şikayetlere göre yeniden hesaplanır.',
        ],
      },
      {
        heading: 'Sorumluluk',
        paragraphs: [
          'Hizmet olduğu gibi sunulur. Listenin eksiksiz, güncel veya bir işletme hakkında kesin doğru olduğu taahhüt edilmez.',
          'Bu MVP koşulları Türkiye Cumhuriyeti hukukuna göre yorumlanır. Yerel deneme sürümünde yetkili merci placeholder olarak İstanbul mahkemeleridir; yayın öncesi güncellenmelidir.',
        ],
      },
    ],
  },
  {
    slug: 'cerez-politikasi',
    title: 'Çerez bildirimi',
    summary: 'Reklam çerezi yok. Oturum, tarayıcıda yerel depoda tutulur.',
    updated: '25 Eylül 2026',
    sections: [
      {
        heading: 'Çerez kullanmıyoruz',
        paragraphs: [
          `${CONTROLLER} reklam, analiz veya üçüncü taraf takip çerezi yazmaz. Zorunlu bir çerez de bırakmayız.`,
          'Web arayüzü oturum jetonunu ve çerez bildirimini kapattığınızı tarayıcının localStorage alanına yazar. Bu bir çerez değildir; aynı cihazda, aynı tarayıcıda durur ve sunucuya kendiliğinden gitmez.',
        ],
      },
      {
        heading: 'Neler durur',
        paragraphs: [
          'yemesek.access: kısa ömürlü erişim jetonu.',
          'yemesek.refresh: yenileme jetonu. Çıkışta silinir.',
          'yemesek.user: e-posta ve görünen ad gibi sizin gördüğünüz profil özeti.',
          'yemesek.notice: bu bildirimi kapattığınız.',
        ],
      },
      {
        heading: 'Mobil',
        paragraphs: [
          'Mobil uygulama jetonu cihazın güvenli deposunda (SecureStore) tutar. Reklam kimliği veya konum izni istemez.',
        ],
      },
      {
        heading: 'Nasıl silinir',
        paragraphs: [
          'Çıkış yapmak jetonları siler. Tarayıcıda site verisini temizlemek yerel kopyayı da siler. Hesabı silmek sunucudaki yenileme kayıtlarını siler.',
          'Pazarlama rızası bir çerez değildir; hesap kaydında durur ve profilden kapatılır.',
        ],
      },
    ],
  },
];

export function getDocument(slug: string): LegalDocument | undefined {
  return DOCUMENTS.find((document) => document.slug === slug);
}

export function isLegalSlug(slug: string): slug is LegalSlug {
  return (LEGAL_SLUGS as readonly string[]).includes(slug);
}
