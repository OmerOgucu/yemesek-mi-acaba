# Moderasyon süresi

Tehdit veya acil işaretli şikayet, inceleme kuyruğunda öne alınır. İşaret `POST /admin/reports/:id/threat` ile konur. Moderatör ve yönetici kullanabilir.

Hedef ilk bakış süresi ayar `moderationSlaHours` içindedir. Varsayılan 24 saattir. Panelde “Tehdit işaretli kayıtlar öne alınır” satırı bu sayıyı gösterir.

Bu bir sözleşme cezası değildir. Süre dolunca kayıt kendiliğinden gizlenmez. Nöbetçi, kuyruğu bu sırayla okur: önce tehdit, sonra eski kayıt.
