const stories=[
 {style:'fun',kind:'espri',invite:'Aklıma bir espri geldi!',text:'Koşu bandıyla aramız çok iyi. Ben yürüdükçe o da konuyu uzatıyor. 🏃'},
 {style:'fun',kind:'fıkra',invite:'Kısacık bir spor fıkrası anlatayım mı?',text:'Filiz spor salonuna gitmiş. “Hedefin ne?” demişler. “Bugün kapıyı buldum, yarın aletlerle tanışacağım!” 🌱'},
 {style:'fun',kind:'bilmece',invite:'Yemekli bir bilmecem var!',text:'Hangi sporcu hep mutfakta antrenman yapar? Cevap: Çırpıcı! Her gün yumurtalarla çalışıyor. 🥣'},
 {style:'funny',kind:'espri',invite:'Minik bir espri yapayım mı?',text:'Salatayla fotoğraf çektirdim. O da “Maruldan gülümse!” dedi. 🥬'},
 {style:'funny',kind:'fıkra',invite:'Bir mutfak fıkrası geldi aklıma!',text:'Kaşık, çatala “Spora başladım” demiş. Çatal sormuş: “Hangi dal?” Kaşık: “Çorba dalış!” 🥄'},
 {style:'funny',kind:'espri',invite:'Sporla ilgili bir esprim var!',text:'Dambıllarla ilişkimiz biraz ağır ilerliyor. Ama birbirimizi kaldırıyoruz. 💪'},
 {style:'absurd',kind:'fıkra',invite:'Biraz absürt bir fıkra anlatayım mı?',text:'Brokoli barfikse asılmış. Havuç sormuş: “Kaç tekrar?” Brokoli: “Bilmem, ben burada küçük bir orman kuruyorum.” 🥦'},
 {style:'absurd',kind:'espri',invite:'Yaprak frekansına tuhaf bir espri düştü!',text:'Avokado yoga dersine geç kalmış. Çekirdeği bir türlü merkezlenememiş. 🥑'},
 {style:'absurd',kind:'bilmece',invite:'Mutfak galaksisinden bir bilmece!',text:'Uzayda spor yapan makarnaya ne denir? Astro-penne! 🚀'},
 {style:'serious',kind:'bilmece',invite:'Kısa bir mutfak bilmecesi ister misin?',text:'Dişleri vardır ama yemek yiyemez. Nedir? Çatal. 🍴'},
 {style:'serious',kind:'espri',invite:'Küçük bir spor esprisi paylaşayım mı?',text:'Bugünün en kısa antrenmanı: “Başlamak” kelimesini harekete çevirmek. Ben ilk adımı bir yaprakla attım. 🌱'},
 {style:'serious',kind:'fıkra',invite:'Kısa bir hareket hikâyesi anlatayım mı?',text:'Filiz “Bugün sadece bir adım atacağım” demiş. Sonra ayakkabısını ararken evde on tur atmış. Bazen başlangıç planladığından hareketli olur.'}
];
export function chooseCompanionStory(preferences,index=0){const choices=stories.filter(story=>preferences[story.style]);return choices.length?choices[index%choices.length]:null;}
