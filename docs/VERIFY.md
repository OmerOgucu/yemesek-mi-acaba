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

Durumlar: YENİ, DEVAM EDİYOR, ÇÖZÜLDÜ, DOĞRULANMADI. ÇÖZÜLDÜ, ilgili test kimliğinin aynı SHA, aynı `run_id` ve `run_attempt` içinde `pass` olmasına ve kanıt işinin success olmasına bağlıdır. Job’un yeşil olması tek başına ÇÖZÜLDÜ değildir. Atlanan veya silinen test NOT_RUN’dır. NOT_RUN ve BLOCKED_EXTERNAL PASS sayılmaz. Durum, güvenilen bot yorumundaki `yemesek-state v1` JSON kaydından taşınır. Otomatik birleştirme ve production deploy yok.

`7eda88e` üzerinde `cursor[bot]`, `pull_request` ile check koşusunu başlattı: https://github.com/OmerOgucu/yemesek-mi-acaba/actions/runs/36198945118 Sonuç FAIL. Android export proje dışına yazdı, `runtime` skipped. Düzeltme `dist/android`.

PR başı `05a2df05caef7744508c2f50cf0193e8dfb34a17` için aynı bot ve `pull_request` olayı check koşusunu tamamladı: https://github.com/OmerOgucu/yemesek-mi-acaba/actions/runs/36218164866 `check`, `runtime`, `report` PASS. Audit: https://github.com/OmerOgucu/yemesek-mi-acaba/actions/runs/36218164829 PASS. Checkout edilen ve rapora yazılan SHA merge commit `54268a900ca8e7185ae3edc96a46a4f3561f7119`. `main`, `release` ve `verify-notify` bu PR güncellemesinde çalışmadı. Türkçe özet report job çıktısıdır; `@OmerOgucu` yorumu bu birleşme öncesi DOĞRULANMADI. Örnek şablon `docs/VERIFY-SAMPLE.md` runtime’ı NOT_RUN bırakır ve PASS değildir.
