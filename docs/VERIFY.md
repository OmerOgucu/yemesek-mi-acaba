# Sürekli doğrulama

PR, main ve yayın ayrı workflow kullanır. Aynı olayda test iki kez koşmaz. Yayın, etiketin gösterdiği commit’i doğrular. O commit’te `check` veya `main` zaten başarılıysa ağır işler yeniden koşmaz; raporda o koşunun adresi durur.

| Workflow | Tetik | Ne çalışır |
| --- | --- | --- |
| `check` | `pull_request` | Kaynak testleri, imaj, sonra Compose/Playwright. Job adı `check` korunur. |
| `main` | `push` → `main` | Aynı işler, merge commit’i üzerinde. PR workflow’u tekrar etmez. |
| `release` | `release` published | `github.sha` etiket commit’i değilse düşer. |
| `dependency audit` | PR, main push, haftalık | Yalnız `pnpm audit`. |
| `verify-notify` | `workflow_run` | Yorumu main’deki kod yazar. PR head checkout edilmez. |

PR içindeki `report` job’u Türkçe özeti Actions adım özetine yazar. Yazma yetkisi yoktur. `@OmerOgucu` bildirimi yalnız önemli yeni FAIL veya kapanan önemli bulgu için, aynı SHA ve aynı bulgu ikinci kez yazılmaz. `verify-notify` default branch’te durduğu için bu PR birleşmeden canlı yorumu çalıştıramaz. Karar mantığı `ops/verify/report.test.mjs` içindedir.

Durumlar: YENİ, DEVAM EDİYOR, ÇÖZÜLDÜ, DOĞRULANMADI. ÇÖZÜLDÜ yalnız ilgili job PASS ve koruma testi duruyorsa. NOT_RUN ve BLOCKED_EXTERNAL PASS sayılmaz. Otomatik birleştirme ve production deploy yok.

`7eda88e` üzerinde `cursor[bot]`, `pull_request` ile check koşusunu başlattı: https://github.com/OmerOgucu/yemesek-mi-acaba/actions/runs/36198945118 Sonuç FAIL. Android export proje dışına yazdı, `runtime` skipped. Düzeltme `dist/android`.
