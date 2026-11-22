// Europapokal-Daten. Quelle: UEFA-Koeffizienten (kassiesa.net, 5-Jahres-Wertung 2022/23–2026/27, Stand 05.11.2026).
// Pool: alle Klubs, die in den letzten fünf Spielzeiten an UEFA-Klubwettbewerben teilgenommen haben (ohne Deutschland, ohne Russland).
// Format je Land: Name, Koeffizient; Klubs als "Name=5-Jahres-Punkte".
export const UEFA_COUNTRIES = {
  Eng: ["England", 107.685], Ita: ["Italien", 91.732], Esp: ["Spanien", 86.493], Ger: ["Deutschland", 84.973], Fra: ["Frankreich", 72.296],
  Por: ["Portugal", 69.15], Bel: ["Belgien", 64.05], Ned: ["Niederlande", 56.395], Tur: ["Türkei", 53.075], Gre: ["Griechenland", 47.612],
  Cze: ["Tschechien", 46.325], Pol: ["Polen", 45.725], Nor: ["Norwegen", 41.012], Den: ["Dänemark", 40.806], Cyp: ["Zypern", 35.443],
  Sui: ["Schweiz", 32.2], Aut: ["Österreich", 29.65], Hun: ["Ungarn", 29.312], Cro: ["Kroatien", 27.906], Swe: ["Schweden", 27],
  Sco: ["Schottland", 26.85], Rom: ["Rumänien", 26.125], Ukr: ["Ukraine", 24.837], Azb: ["Aserbaidschan", 24.187], Isr: ["Israel", 24.125],
  Slo: ["Slowenien", 23.593], Svk: ["Slowakei", 22.375], Bul: ["Bulgarien", 22.062], Srb: ["Serbien", 19], Isl: ["Island", 17.02],
  Irl: ["Irland", 16.343], Arm: ["Armenien", 15.812], Lat: ["Lettland", 14.625], Bos: ["Bosnien-Herzegowina", 14.468], Kos: ["Kosovo", 14.031],
  Fin: ["Finnland", 13.875], Kaz: ["Kasachstan", 12.875], Lie: ["Liechtenstein", 11], Mol: ["Moldau", 10.25], Far: ["Färöer", 9.875],
  Alb: ["Albanien", 9.5], Mac: ["Nordmazedonien", 8.967], Bls: ["Belarus", 8.708], Lit: ["Litauen", 8.125], Gib: ["Gibraltar", 7.874],
  And: ["Andorra", 7.832], Mlt: ["Malta", 7.625], Est: ["Estland", 7.041], Geo: ["Georgien", 6.75], Nir: ["Nordirland", 6.625],
  Lux: ["Luxemburg", 6.25], Mon: ["Montenegro", 5.833], Wal: ["Wales", 4.499], Sma: ["San Marino", 2.998],
};
const RAW = `Eng:Arsenal=132;Manchester City=110.5;Liverpool=109;Aston Villa=95;Tottenham Hotspur=77;Chelsea=74.3;Manchester United=68.5;West Ham United=48;Newcastle United=29.8;Crystal Palace=25.9;Nottingham Forest=23;AFC Bournemouth=8;Brighton & Hove Albion=21;Sunderland AFC=5
Esp:Real Madrid=128.5;FC Barcelona=110.3;Atlético Madrid=94.8;Real Betis=75.5;Real Sociedad=52;Villarreal=43;Athletic Bilbao=38.8;Sevilla=27;Rayo Vallecano=22;Celta de Vigo=19.3;Getafe=2.5;Girona FC=8;Osasuna=2.5
Fra:Paris Saint-Germain=127;Lille OSC=58.8;Olympique Lyon=49.8;AS Monaco=47;Olympique Marseille=41;Stade Rennais=26;RC Strasbourg=21.5;RC Lens=20.5;OGC Nice=20;Stade Brestois=16.8;Toulouse FC=10;FC Nantes=8
Ita:Internazionale=119;AS Roma=83.8;Fiorentina=76.3;Atalanta=71;Napoli=62;AC Milan=62;Juventus=59.3;Lazio=50;Bologna=30.8;Como 1907=12
Bel:Club Brugge=80.3;Union Saint-Gilloise=55;Anderlecht=32.3;AA Gent=31;Racing Genk=25;Sint-Truiden=5;Charleroi=1.5;Cercle Brugge=12.8;Royal Antwerp=8.5
Por:Sporting CP Lisbon=80;FC Porto=78.8;Benfica=78;Sporting Braga=50.8;Vitória Guimarães=18.8;União Torreense=4;CD Santa Clara=2.5;FC Arouca=2;Gil Vicente=2.5
Ned:PSV Eindhoven=70.3;Feyenoord=55;AZ Alkmaar=53.9;Ajax=40.3;FC Twente Enschede=19.5;NEC Nijmegen=5;Go Ahead Eagles=6.5;FC Utrecht=3
Tur:Fenerbahçe=62.8;Galatasaray=48.5;Istanbul Basaksehir=21;Besiktas=16.5;Trabzonspor=12.5;Samsunspor=11.1;Adana Demirspor=2.5;Sivasspor=10;Konyaspor=2
Gre:Olympiakos Piraeus=61.3;PAOK Thessaloniki=37.8;Panathinaikos=35.3;AEK Athens=30.5;OFI Heraklion=4;Aris Thessaloniki=5.5
Ukr:Shakhtar Donetsk=59.3;Dynamo Kyiv=14.5;SC Dnipro-1=12;Zorya Luhansk=7;Polissya Zhytomyr=5.5;LNZ Cherkasy=1.5;FC Oleksandriya=1.5;Kryvbas Kryviy Rih=2.5;Vorskla Poltava=3
Nor:Bodø/Glimt=58;Molde FK=19.8;SK Brann Bergen=17.3;Viking Stavanger=13.5;Lillestrøm SK=5;Tromsø IL=4.5;Rosenborg BK=4.5;Fredrikstad FK=2.5
Hun:Ferencváros=56.3;Paksi FC=6;ETO Györ=4.5;DVSC Debrecen=4;Puskás Akadémia=5.5;FC Fehérvár=4.5;Kecskeméti TE=1.5;Zalaegerszegi TE=1.5;Kisvárda FC=2
Cze:Viktoria Plzen=51;Slavia Praha=41;Sparta Praha=36.3;FK Jablonec=2.5;Hradec Kralove=2.5;Sigma Olomouc=6.6;Baník Ostrava=4.5;Mladá Boleslav=4;Bohemians Praha=1.5;1.FC Slovácko=4
Den:FC København=46.4;FC Midtjylland=43.8;FC Nordsjælland=9.5;AGF Aarhus=4;Brøndby IF=6.5;Silkeborg IF=8;Viborg FF=2.5
Sco:Glasgow Rangers=42.8;Celtic=41;Hearts FC=14;Hibernian=7.5;Aberdeen=7.5;Motherwell=4;Dundee United=4;Kilmarnock=2.5;St. Mirren=2
Cro:Dinamo Zagreb=42.5;NK Rijeka=18.6;Hajduk Split=12.5;NK Varazdin=3;NK Osijek=5.5
Azb:Qarabag FK=36.3;Sabah FK=14;Zira FK=7;Neftchi Baku=5.5;Araz Nakhchivan=2;Sumgayit FK=1.5;Gabala FK=3
Svk:Slovan Bratislava=36;Spartak Trnava=10;DAC Dunajska Streda=6.5;MSK Zilina=4.5;FC Kosice=1.5;MFK Ruzomberok=4
Srb:Red Star Belgrade=34.5;Partizan Belgrade=17.5;TSC Backa Topola=8.1;Vojvodina Novi Sad=5;Cukaricki Belgrade=4.5;Zeleznicar Pancevo=1.5;Radnicki 1923=3;Novi Pazar=1.5;Radnicki Nis=1.5
Swe:Djurgårdens IF=32;Malmö FF=10;BK Häcken=8.5;IF Elfsborg=8.5;Hammarby IF=5.5;Mjällby AIF=5;IFK Göteborg=2;GAIS Göteborg=1.5;AIK Stockholm=4.5;Kalmar FF=1.5
Aut:FC Salzburg=31;Rapid Wien=28.3;Sturm Graz=28;LASK=16;Austria Wien=10.5;Wolfsberger AC=5
Pol:Lech Poznan=30.3;Legia Warsaw=28.5;Jagiellonia Bialystok=25;Raków Czestochowa=22.3;Górnik Zabrze=2.5;GKS Katowice=2;Wisla Kraków=2.5;Slask Wroclaw=2;Pogon Szczecin=3.5;Lechia Gdansk=1.5
Sui:FC Lugano=27.3;FC Basel=22.5;Young Boys=21.5;Servette FC Genève=11;Lausanne Sports=10;FC Sankt Gallen=6.5;FC Thun=2.5;FC Sion=2.5;FC Zürich=5;FC Luzern=2
Bul:Ludogorets Razgrad=27.3;Levski Sofia=12;CSKA Sofia=6.5;CSKA 1948 Sofia=5.5;Arda Kardzhali=2.5;Cherno More Varna=3;Botev Plovdiv=3.5
Cyp:Pafos FC=26.6;AEK Larnaca=21.8;Omonia Nicosia=21.3;APOEL Nicosia=14.8;Apollon Limassol=7;Aris Limassol=6.5
Slo:NK Celje=26;Olimpija Ljubljana=16.4;NK Maribor=8.5;NK Koper=4.5;NK Bravo=3;NK Aluminij=1.5;NK Domzale=1;Mura Murska Sobota=1.5
Isr:Maccabi Tel-Aviv=26;Hapoel Beer-Sheva=14.5;Maccabi Haifa=14.5;Beitar Jerusalem=5.5;Hapoel Tel-Aviv=2.5;Maccabi Petah-Tikva=2;Maccabi Netanya=1.5
Rom:FCSB=25.5;CFR Cluj=16.5;Universitatea Craiova=14;Universitatea Cluj=3;Corvinul Hunedoara=2;Sepsi OSK=4.5;Farul Constanta=2.5
Irl:Shamrock Rovers=19.4;St. Patrick's Athletic=7.5;Shelbourne=6;Derry City=5.5;Bohemians Dublin=2;Dundalk=1.5;Sligo Rovers=2
Bos:Zrinjski Mostar=14.8;Borac Banja Luka=14.1;FK Sarajevo=5;Velez Mostar=4;Zeljeznicar Sarajevo=2.5;Tuzla City=1.5
Kos:FC Drita=14.6;FC Ballkani=11.5;KF Malisheva=3.5;KF Dukagjini=3;FC Prishtina=1.5;KF Llapi=2.5;SC Gjilani=2
Isl:Vikingur Reykjavik=14.3;Breidablik=10;Valur Reykjavik=5;KA Akureyri=3.5;Stjarnan FC=3;IF Vestri=1.5;KR Reykjavik=1
Fin:KuPS Kuopio=14;HJK Helsinki=12;Ilves Tampere=5.5;Inter Turku=3.5;SJK Seinäjoki=2.5;VPS Vaasa=1;Haka Valkeakoski=1;Honka Espoo=1
Gib:Lincoln Red Imps=13.5;St Joseph's FC=5;FCB Magpies=4.5;Europa FC=3
Mol:Sheriff Tiraspol=13;Petrocub Hîncesti=9;Milsami Orhei=7;Zimbru Chisinau=6;Sfântul Gheorghe=1
Lat:RFS Riga=12.5;Riga FC=11;FK Auda=6.5;FK Liepaja=4;Valmieras FK=3.5;BFC Daugavpils=1
Far:KI Klaksvik=12;Víkingur Gøta=7;HB Torshavn=6.5;B36 Torshavn=5;NSI Runavik=3
Arm:FC Noah=11.8;Pyunik Yerevan=11.5;Ararat-Armenia=10;Alashkert FC=4;Urartu FC=4;Ararat Yerevan=1
Lit:Zalgiris Vilnius=11.5;Kauno Zalgiris=7;FK Panevezys=6.5;FC Hegelmann=3;Banga Gargzdai=1.5;Transinvest Vilnius=1.5;FA Siauliai=1;Suduva Marijampole=1.5
Kaz:FK Astana=11.5;Kairat Almaty=11;Tobol Kustanai=8;FK Aktobe=4.5;Ordabasy Shymkent=4.5;FK Yelimay=1;FK Kyzylzhar=2
Mac:Shkendija Tetovo=11.4;FC Struga=4;FK Shkupi=4;Vardar Skopje=3;Makedonija GjP=2.5;Sileks Kratovo=2;Rabotnicki Skopje=1;Tikves Kavadarci=1;Akademija Pandev=1
Nir:Larne FC=9.5;Linfield Belfast=8.5;Crusaders Belfast=4;Cliftonville=3.5;Glentoran=2;Coleraine=1.5;Dungannon Swifts=1.5
Mlt:Hamrun Spartans=9.5;Floriana=5.5;Gzira United=4;Hibernians FC=3.5;Marsaxlokk=2;Birkirkara=2;Valletta FC=1.5;Sliema Wanderers=1.5;Balzan FC=1.5
Lie:FC Vaduz=9
And:Inter Club d'Escaldes=8.5;Atlètic Club d'Escaldes=6.5;FC Santa Coloma=5;UE Santa Coloma=3.5
Bls:Dinamo Minsk=8.5;Neman Grodno=6;BATE Borisov=5.5;Torpedo Zhodino=4;ML Vitebsk=2;Shakhtior Saligorsk=2;Dynamo Brest=1;Isloch Minsk Raion=1;FC Gomel=1.5
Est:Paide Linnameeskond=8.5;Flora Tallinn=8;Levadia Tallinn=7.5;Kalju Nomme=3;Kalev Tallinn=1;Trans Narva=1
Wal:The New Saints=8.5;Penybont=3;Connah's Quay=3;Caernarfon Town=2.5;Haverfordwest County=2.5;Bala Town=2;Newtown=1.5
Geo:Iberia 1999=7.5;Dila Gori=6;Torpedo Kutaisi=5.5;Dinamo Tbilisi=5;Dinamo Batumi=4;Spaeri Tbilisi=1.5
Lux:Differdange 03=7.5;F91 Dudelange=6.5;UNA Strassen=4;Progrès Niederkorn=3;Racing Union Luxembourg=2.5;Swift Hesperange=2;Atert Bissen=1.5;US Mondorf-les-Bains=1;CS Fola Esch=1
Alb:Egnatia Rrogozhinë=7;Vllaznia Shkodër=6;Partizani Tirana=6;Dinamo Tirana=5;KF Tirana=4;AF Elbasani=1;KF Laçi=1.5
Mon:Sutjeska Niksic=6;Buducnost Podgorica=6;Decic Tuzi=5.5;Mornar Bar=3;OFK Petrovac=1;Arsenal Tivat=1;Iskra Danilovgrad=1
Sma:La Fiorita=6;AC Virtus=5;Tre Fiori=4.5;Tre Penne=3.5;Cosmos=1`;

// Stärke (0–100) aus Klub- und Verbandskoeffizient: Top-Klubs ~88–93, kleine Meister aus kleinen Ländern ~40–50.
export const UEFA_CLUBS = RAW.split("\n").flatMap((line) => {
  const [cc, rest] = line.split(":");
  const coef = UEFA_COUNTRIES[cc][1];
  return rest.split(";").map((x, i) => {
    const [name, pts] = x.split("=");
    const p = Number(pts);
    const str = Math.round((12 + 5 * Math.log(1 + p) + 12 * Math.log(1 + coef)) * 100) / 100;
    return { id: "u_" + cc + "_" + i, name, cc, pts: p, str: Math.min(94, str) };
  });
});

// Startplätze in der Ligaphase je Wettbewerb (ohne Deutschland, das sich über Bundesliga/DFB-Pokal qualifiziert).
// Feste Kontingente nach Verbandsrangliste; "free" Plätze werden je Saison gewichtet unter den übrigen Ländern verlost
// (Meisterweg/Qualifikanten). eps = European Performance Spots für die besten Ligen der Vorsaison.
export const UEFA_QUOTA = {
  cl: { quota: { Eng: 4, Ita: 4, Esp: 4, Fra: 3, Por: 2, Bel: 2, Ned: 2, Tur: 1, Gre: 1, Cze: 1, Pol: 1, Nor: 1, Den: 1, Cyp: 1 }, eps: 2, free: 2, freeFrom: 15 },
  el: { quota: { Eng: 2, Ita: 2, Esp: 2, Fra: 2, Por: 2, Bel: 2, Ned: 2, Tur: 2, Gre: 2, Cze: 2, Pol: 1, Nor: 1, Den: 1, Cyp: 1, Sui: 1, Aut: 1, Hun: 1, Cro: 1, Swe: 1, Sco: 1 }, eps: 0, free: 4, freeFrom: 20 },
  ecl: { quota: { Eng: 1, Ita: 1, Esp: 1, Fra: 1, Por: 1, Bel: 1, Ned: 1, Tur: 1, Gre: 1, Cze: 1, Pol: 2, Nor: 1, Den: 1, Cyp: 1, Sui: 1, Aut: 1, Hun: 1, Cro: 1, Swe: 1, Sco: 1, Rom: 1, Ukr: 1, Azb: 1, Isr: 1, Slo: 1, Svk: 1, Bul: 1, Srb: 1 }, eps: 0, free: 6, freeFrom: 28 },
};
export const UEFA_COMPS = [
  { id: "cl", name: "Champions League", short: "CL", lpDays: [3, 5, 7, 10, 12, 14, 16, 18], ko: [[19, 20], [22, 23], [25, 26], [28, 29], [33]], prize: { start: 18.6e6, win: 2.1e6, draw: 0.7e6, ko: [1e6, 11e6, 12.5e6, 15e6, 18.5e6], title: 6.5e6 } },
  { id: "el", name: "Europa League", short: "EL", lpDays: [3, 5, 7, 10, 12, 14, 16, 18], ko: [[19, 20], [22, 23], [25, 26], [28, 29], [31]], prize: { start: 4.3e6, win: 0.45e6, draw: 0.15e6, ko: [0.3e6, 1.75e6, 2.5e6, 2.8e6, 6e6], title: 6e6 } },
  { id: "ecl", name: "Conference League", short: "ECL", lpDays: [2, 6, 8, 11, 13, 17], ko: [[19, 20], [22, 23], [25, 26], [28, 29], [30]], prize: { start: 3.2e6, win: 0.4e6, draw: 0.13e6, ko: [0.2e6, 0.8e6, 1.3e6, 2e6, 4e6], title: 3e6 } },
];
// Saison 1: tatsächliche deutsche Teilnehmer 2026/27 (Abschlusstabelle 2025/26)
export const GER_SEASON1 = { cl: ["FC Bayern München", "Borussia Dortmund", "RB Leipzig", "VfB Stuttgart"], el: ["TSG 1899 Hoffenheim", "Bayer 04 Leverkusen"], ecl: ["SC Freiburg"] };
