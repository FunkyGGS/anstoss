// Länderspezifische Namen und Nationalitäten der (fiktiven) Spieler.
// Pools: Vornamen | Nachnamen. Mehrere Länder teilen sich einen Pool, wenn die Namen ähnlich sind.
const P = {
  ger: ["Lukas Leon Finn Jonas Paul Luca Felix Maximilian Tim Niklas Jan Moritz Tobias Simon Florian Julian David Fabian Marvin Kevin Dennis Philipp Nils Lennard Malte Jannik Christian Sebastian Marco Daniel",
        "Müller Schmidt Schneider Fischer Weber Meyer Wagner Becker Schulz Hoffmann Koch Richter Klein Wolf Schröder Neumann Schwarz Zimmermann Braun Krüger Hofmann Hartmann Lange Schmitt Werner Krause Meier Lehmann Köhler Herrmann Walter König Mayer Huber Kaiser Fuchs Peters Lang Scholz Möller Weiß Jung Hahn Vogel Friedrich Keller Günther Frank Berger Winkler Roth Beck Lorenz Baumann Franke Albrecht Ludwig Böhm Pohl Brandt"],
  aut: ["Florian David Lukas Stefan Christoph Andreas Manuel Philipp Patrick Dominik Marcel Kevin Matthias Thomas Raphael Valentin Konrad Alexander",
        "Gruber Huber Bauer Wagner Pichler Steiner Moser Mayer Hofer Leitner Berger Fuchs Eder Fischer Schmid Winkler Weber Schwarz Maier Reiter Brunner Lang Baumgartner Auer Wimmer Egger"],
  sui: ["Luca Noah Jan Nico Fabian Silvan Remo Yannick Dario Cédric Michel Kevin Loris Joël Gian Marco Elias Jonas",
        "Müller Meier Schmid Keller Weber Huber Schneider Meyer Steiner Fischer Gerber Brunner Baumann Frei Zimmermann Moser Widmer Wyss Graf Roth Bühler Favre Rochat Bernasconi Rossi"],
  eng: ["Harry Jack James Oliver Charlie George Thomas Jacob Alfie Joe Callum Ben Ryan Kyle Jordan Luke Mason Reece Declan Jarrod Marcus Conor Lewis Jamie",
        "Smith Jones Taylor Brown Williams Wilson Johnson Davies Robinson Wright Thompson Evans Walker White Roberts Green Hall Wood Jackson Clarke Hughes Turner Hill Cooper Ward Morris Ward Mitchell Barnes Palmer"],
  sco: ["Callum Scott Ryan Kieran Craig Lewis Andrew John Stuart Fraser Billy Ross Lyndon Liam Grant",
        "Christie Gilmour Hendry McKenna Ferguson Adams Campbell Fraser Stewart Thomson Murray Ross McLean Paterson Reid"],
  irl: ["Seán Conor Darragh Cian Liam Evan Jason Shane Ciarán Aaron Jamie Niall Rory Eoin Kevin",
        "Murphy Kelly O'Sullivan Walsh O'Brien Byrne Ryan O'Connor O'Neill Doyle McCarthy Gallagher Lynch Kennedy Brady Duffy Coleman Doherty Molumby Keane"],
  wal: ["Rhys Dylan Owen Gareth Aaron Ethan Harry Joe Connor Brennan Kieffer Neco Jordan",
        "Jones Williams Davies Evans Thomas Roberts Lewis Hughes Morgan Griffiths Owen James Allen Moore Lawrence"],
  fra: ["Lucas Hugo Théo Mathis Enzo Louis Nathan Jules Kylian Antoine Raphaël Ousmane Aurélien Benjamin Adrien Jordan Mattéo Rayan Warren Bradley",
        "Martin Bernard Dubois Thomas Robert Richard Petit Durand Leroy Moreau Simon Laurent Lefebvre Michel Garcia David Bertrand Roux Vincent Fournier Morel Girard André Mercier Blanc Guerin Boyer Lacroix Lemaire Fontaine"],
  bel: ["Lucas Arthur Louis Thibaut Kevin Romelu Youri Axel Jérémy Dries Leander Arne Charles Maxim Senne Jens Wout",
        "Peeters Janssens Maes Jacobs Mertens Willems Claes Goossens Wouters De_Smet Dubois Lambert Dupont Vermeulen Raskin Lemaire Martens Claessens Hermans Desmet Vandenberghe Leclercq Michiels Smets Verstraeten"],
  ned: ["Daan Sem Lucas Bram Thijs Jesse Luuk Milan Ruben Jurriën Frenkie Matthijs Virgil Cody Teun Xavi Joey Wout Quinten",
        "de_Jong de_Vries van_Dijk Bakker Janssen Visser Smit Meijer de_Boer Mulder de_Groot Bos Vos Peters Hendriks van_Leeuwen Dekker Brouwer de_Wit Dijkstra Smits"],
  esp: ["Pablo Álvaro Hugo Daniel Alejandro Javier Sergio Marcos Adrián Iker Mikel Pedro Rodrigo Unai Dani Fermín Gavi Nico Aitor Raúl Carlos",
        "García Rodríguez González Fernández López Martínez Sánchez Pérez Gómez Martín Jiménez Ruiz Hernández Díaz Moreno Muñoz Álvarez Romero Navarro Torres Domínguez Gil Vázquez Serrano Ramos Blanco Molina Morales Ortega Delgado"],
  ita: ["Lorenzo Alessandro Francesco Matteo Leonardo Andrea Gabriele Riccardo Federico Nicolò Davide Giacomo Gianluigi Marco Simone Tommaso Mattia Stefano Sandro",
        "Rossi Russo Ferrari Esposito Bianchi Romano Colombo Ricci Marino Greco Bruno Gallo Conti De Luca Mancini Costa Giordano Rizzo Lombardi Moretti"],
  por: ["João Diogo Rúben Bernardo Rafael Gonçalo Tiago Francisco Nuno Pedro Vitinha Bruno Rodrigo Afonso Martim Duarte André Ricardo",
        "Silva Santos Ferreira Pereira Oliveira Costa Rodrigues Martins Jesus Sousa Fernandes Gonçalves Gomes Lopes Marques Alves Almeida Ribeiro Pinto Carvalho Teixeira Moreira Correia Mendes Neves Dias"],
  bra: ["Gabriel Lucas Matheus Pedro Vinícius Rodrygo Bruno Thiago Felipe Rafael Gustavo Igor Endrick Éder Danilo Raphinha Murillo Wesley João Caio Luiz",
        "Silva Santos Oliveira Souza Lima Pereira Costa Rodrigues Almeida Nascimento Barbosa Ribeiro Carvalho Gomes Martins Rocha Moura Cardoso Teixeira Freitas Ferreira Alves Pinto Monteiro Mendes Nunes Vieira Correia"],
  arg: ["Lautaro Julián Enzo Alexis Rodrigo Nahuel Leandro Thiago Nicolás Valentín Facundo Matías Agustín Exequiel Giuliano Franco Emiliano Gonzalo",
        "González Rodríguez Gómez Fernández López Díaz Martínez Pérez Romero Sánchez Álvarez Acuña Paredes Molina Romero Fernández Medina Barco Benítez Ruiz Sosa Castro Ríos Herrera Medina Aguirre"],
  uru: ["Federico Darwin Ronald Manuel Rodrigo Facundo Maximiliano Nicolás Giorgian Agustín Sebastián Mathías",
        "Olivera Giménez Viña Cáceres Rodríguez Torres Martínez Rodríguez Fernández Pereira Silva Sosa Cabrera Méndez Correa Acosta Benítez Castro Ferreira"],
  col: ["Luis James Jhon Daniel Juan Davinson Jefferson Richard Yerry Camilo Jhon Kevin Andrés Santiago",
        "Díaz Rodríguez Córdoba Muñoz Sánchez Arias Ríos Mina Cuesta Castaño Carrascal Durán Mosquera Gómez Pérez Vargas Ramírez Torres Castro Ortiz Moreno"],
  mex: ["Santiago Edson Hirving Raúl Jorge Luis César Guillermo Johan Alexis Julián Erick Orbelín Diego",
        "Hernández García Martínez López González Álvarez Jiménez Sánchez Romo Montes Vásquez Gallardo Pineda Vega Gutiérrez Quiñones"],
  usa: ["Christian Tyler Weston Brenden Gio Sergiño Antonee Timothy Zack Matt Chris Josh Ricardo Folarin Haji Malik",
        "Adams Robinson Steffen Turner Richards Sargent Wright Johnson Miller Davis Brown Smith Jones Williams Anderson Thomas Moore Martin Jackson Thompson Harris Clark Lewis"],
  wafr: ["Moussa Mamadou Ibrahima Sadio Kalidou Idrissa Cheikh Pape Ismaïla Abdoulaye Seko Amadou Yves Franck Serge Nicolas Simon Wilfried Sébastien Bamba Lassine",
         "Diallo Traoré Koné Diarra Coulibaly Ndiaye Sarr Gueye Diop Sow Cissé Camara Kouyaté Fofana Doumbia Sangaré Diakité Touré"],
  cmr: ["André Bryan Vincent Carlos Frank Christopher Jean-Charles Karl Georges Martin",
        "Castelletto Wooh Kunde Moumi Ngamaleu Nkoudou Tolo Nouhou Ntcham Mbarga Ndongo Eto Mbia Nkoulou Song Fai Ngadeu Bassogog Moukandjo Zambo"],
  nga: ["Victor Samuel Ademola Alex Calvin Moses Wilfred Kelechi Ola Taiwo Frank Bright Chidera Raphael Terem",
        "Aina Simon Ajayi Okafor Eze Nwankwo Adeyemi Akinola Okonkwo Adebayo Obi Eze Nwosu Babatunde Okoro Uche Afolabi Ogunleye Chukwu"],
  gha: ["Mohammed Thomas Antoine Inaki Daniel Jordan Kamaldeen Abdul Ernest Kwadwo Kofi Kwame Osman",
        "Williams Amartey Sulemana Salisu Nuamah Mensah Asante Owusu Boateng Bukari Fatawu Opoku"],
  magh: ["Achraf Hakim Youssef Sofyan Nayef Brahim Azzedine Amine Riyad Ismaël Mohamed Yassine Bilal Anass Rayan Ilias",
         "Díaz Adli Belhyane Atal Zerrouki Khazri Benali Amrani El_Idrissi Bouzid Haddad Mansouri Belkacem Ziani Saidi Cherif Bouazza Tahiri El_Amrani Rahmani Kaddouri"],
  jpn: ["Takefusa Kaoru Wataru Takehiro Daichi Ritsu Junya Ayase Hiroki Yuki Koki Daizen Kou Keito Takumi Yukinari",
        "Ito Machida Sugawara Maeda Nakamura Sano Suzuki Tanaka Sato Takahashi Watanabe Yamamoto Kobayashi Kato Yoshida Yamada Sasaki Matsumoto Inoue Kimura"],
  kor: ["Heung-min Kang-in Min-jae Hee-chan Woo-yeong Jae-sung In-beom Gue-sung Young-woo Seung-ho Jin-su",
        "Lee Kim Jeong Park Cho Seol Paik Hong Oh Yang Bae"],
  tur: ["Arda Kerem Hakan Orkun Ferdi Barış Mert Kaan Abdülkerim Ozan Salih Yusuf Kenan Cengiz Emre Semih Can Burak Oğuz",
        "Yılmaz Kaya Demir Şahin Çelik Yıldız Yıldırım Öztürk Aydın Özdemir Arslan Doğan Kılıç Aslan Çetin Kara Koç Kurt Özkan Şimşek Güler Ayhan"],
  pol: ["Jakub Kacper Bartosz Mateusz Piotr Kamil Sebastian Przemysław Karol Nicola Jan Michał Paweł Krzysztof Adam Jakub",
        "Nowak Kowalski Wiśniewski Wójcik Kowalczyk Kamiński Woźniak Dąbrowski Kozłowski Jankowski Mazur Kwiatkowski Krawczyk Piotrowski Grabowski Cash"],
  cze: ["Tomáš Jakub Patrik Vladimír Adam Lukáš Matěj Václav Ondřej Martin David Pavel Jan Milan Stanislav",
        "Novák Svoboda Novotný Dvořák Černý Procházka Kučera Veselý Horák Němec Pokorný Holeš Krejčí Provod Chorý Šulc Duda Kucka"],
  hun: ["Dominik Roland Milos Bendegúz András Attila Zsolt Barnabás Martin Loïc Kevin Dániel Péter",
        "Orbán Nagy Szabó Kovács Tóth Horváth Varga Kiss Molnár Németh Farkas Balogh Schäfer Varga Lang"],
  rou: ["Radu Ianis Nicolae Andrei Dennis Răzvan Florinel Valentin Ionuț Darius Marius Vlad Alexandru Adrian",
        "Popescu Ionescu Man Marin Burcă Coman Popa Dumitru Stan Munteanu Moldovan Olaru Sorescu"],
  yu: ["Luka Ivan Josip Mateo Marko Dušan Aleksandar Nikola Sergej Strahinja Andrej Mario Dejan Edin Ermedin Stefan Jan Benjamin Vanja Petar",
       "Pavlović Lukić Živković Hadžikadunić Vipotnik Elšnik Bijol Mlakar Ivanović Savić Horvat Kovač Babić Marić Jurić Petrović Nikolić Marković Đorđević Stojanović Jovanović Hodžić Begić Mehmedović Kovačević Novak Popović Ristovski Vuković Radović"],
  alb: ["Armando Kristjan Nedim Arbër Ylber Elseid Jasir Mirlind Berat Milot Vedat Florent Arijon Amir Rron Edon",
        "Bajrami Hoxha Ramadani Asani Daku Rashica Hadergjonaj Muslija Berisha Krasniqi Gashi Hasani Shala Kryeziu"],
  gre: ["Giorgos Konstantinos Dimitris Christos Vangelis Anastasios Kostas Fotis Manolis Tasos Petros Nikos Andreas Giannis Pieros",
        "Papadopoulos Mantalos Siopis Kourbelis Pelkas Ioannidis Papanikolaou Georgiou Nikolaou Papadakis Nikolaidis Georgiadis Konstantinou Vlachos Oikonomou Dimitriou Makris Alexiou Karagiannis"],
  ukr: ["Mykhailo Oleksandr Artem Ruslan Vitaliy Illia Heorhiy Mykola Andriy Taras Viktor Yaroslav Danylo Anatoliy",
        "Shaparenko Matviyenko Konoplya Zubkov Bondar Vanat Shevchenko Kovalenko Petrenko Bondarenko Kovalchuk Melnyk Tkachenko Boyko Kravchenko Oliynyk Lysenko Moroz Savchenko Rudenko"],
  nord: ["Rasmus Mikkel Christian Andreas Joachim Kasper Jonas Erling Martin Alexander Sander Viktor Emil Dejan Gustav Hákon Albert Jesper Oscar Magnus Kristoffer",
         "Hansen Nielsen Jensen Pedersen Andersen Larsen Christensen Johansson Andersson Karlsson Nilsson Eriksson Olsen Berg Thorsteinsson Haraldsson Gudmundsson Hjelde Johansen Kristiansen Lund Holm Dahl Lindqvist Svensson Persson Hedlund Sigurdsson Magnusson Thomsen"],
  fin: ["Teemu Joel Glen Lukas Robin Jere Daniel Fredrik Juhani Matti Oliver Niko Topi",
        "Kamara Lod Uronen Hämäläinen Väisänen Ivanov Keskinen Virtanen Korhonen Mäkinen Nieminen Koskinen Laine Heikkinen"],
  balt: ["Kristers Roberts Jānis Artūrs Gvidas Edgaras Fedor Justas Karol Rauno Henri Markus Mattias",
         "Savaļnieks Tobers Jaunzems Gineitis Utkus Černych Lasickas Novikovas Sappinen Anier Vassiljev Kait Paskotši Liivak Klavan"],
  cau: ["Khvicha Giorgi Georges Otar Saba Zuriko Levan Davit Gor Lucas Tigran Kamran Emin Mahir Toral Renat",
        "Kiteishvili Chakvetadze Lochoshvili Davitashvili Kakabadze Zelarayán Barseghyan Hambardzumyan Haroyan Qurbanlı Mahmudov Dadashov Bayramov Medvedev"],
  kaz: ["Islambek Baktiyar Abat Dastan Askhat Maxim Yan Galymzhan Nuraly Ramazan Aybol",
        "Kuat Zaynutdinov Aymbetov Satpaev Tagybergen Samorodov Vorogovskiy Kenzhebek Alip Orazov Seidakhmet Bystrov"],
  isr: ["Manor Oscar Eran Dor Tai Liel Mohammad Roy Anan Shon Gavriel Ido Yarden Omri",
        "Peretz Baribo Abada Abu_Fani Revivo Khalaili Weissman Dasa Lemkin Glazer Turgeman Biton Cohen Levi Mizrahi Peretz"],
  mlt: ["Teddy Jodi Joseph Kyrian Ryan Matthew Steve Zach Jean Kurt Paul Cain",
        "Jones Mbong Nwoko Camenzuli Borg Zammit Farrugia Grech Vella Galea Muscat Camilleri Attard Pace Caruana"],
  bul: ["Ivan Georgi Dimitar Martin Kiril Radoslav Nikolay Stanislav Valentin Petar Aleksandar Todor Hristo",
        "Ivanov Georgiev Dimitrov Petrov Nikolov Stoyanov Todorov Kostov Popov Despodov Iliev Chochev Krastev Minchev Atanasov Marinov Hristov Angelov"],
  cyp: ["Andreas Grigoris Pieros Ioannis Marinos Charalambos Kostas Loizos Nikolas Fotis Michalis",
        "Sotiriou Pittas Laifis Tzionis Kousoulos Panagiotou Charalambous Kyriakou Georgiou Christodoulou Antoniou Ioannou Loizou Michail"],
};
// Nationalität: Pool, Kürzel, deutscher Name
export const NATS = {
  GER: ["ger", "Deutschland"], AUT: ["aut", "Österreich"], SUI: ["sui", "Schweiz"], LIE: ["sui", "Liechtenstein"], LUX: ["fra", "Luxemburg"],
  ENG: ["eng", "England"], SCO: ["sco", "Schottland"], WAL: ["wal", "Wales"], NIR: ["irl", "Nordirland"], IRL: ["irl", "Irland"], GIB: ["eng", "Gibraltar"],
  FRA: ["fra", "Frankreich"], BEL: ["bel", "Belgien"], NED: ["ned", "Niederlande"], ESP: ["esp", "Spanien"], AND: ["esp", "Andorra"], ITA: ["ita", "Italien"], SMR: ["ita", "San Marino"], MLT: ["mlt", "Malta"],
  POR: ["por", "Portugal"], BRA: ["bra", "Brasilien"], ARG: ["arg", "Argentinien"], URU: ["uru", "Uruguay"], COL: ["col", "Kolumbien"], MEX: ["mex", "Mexiko"], USA: ["usa", "USA"],
  SEN: ["wafr", "Senegal"], CIV: ["wafr", "Elfenbeinküste"], MLI: ["wafr", "Mali"], CMR: ["cmr", "Kamerun"], NGA: ["nga", "Nigeria"], GHA: ["gha", "Ghana"], MAR: ["magh", "Marokko"], ALG: ["magh", "Algerien"],
  JPN: ["jpn", "Japan"], KOR: ["kor", "Südkorea"], TUR: ["tur", "Türkei"], POL: ["pol", "Polen"], CZE: ["cze", "Tschechien"], SVK: ["cze", "Slowakei"], HUN: ["hun", "Ungarn"], ROU: ["rou", "Rumänien"], MDA: ["rou", "Moldau"],
  CRO: ["yu", "Kroatien"], SRB: ["yu", "Serbien"], BIH: ["yu", "Bosnien-Herzegowina"], MNE: ["yu", "Montenegro"], SVN: ["yu", "Slowenien"], MKD: ["yu", "Nordmazedonien"], ALB: ["alb", "Albanien"], KOS: ["alb", "Kosovo"],
  GRE: ["gre", "Griechenland"], BUL: ["bul", "Bulgarien"], CYP: ["cyp", "Zypern"], UKR: ["ukr", "Ukraine"], BLR: ["ukr", "Belarus"], DEN: ["nord", "Dänemark"], NOR: ["nord", "Norwegen"], SWE: ["nord", "Schweden"], ISL: ["nord", "Island"], FRO: ["nord", "Färöer"],
  FIN: ["fin", "Finnland"], LVA: ["balt", "Lettland"], LTU: ["balt", "Litauen"], EST: ["balt", "Estland"], GEO: ["cau", "Georgien"], ARM: ["cau", "Armenien"], AZE: ["cau", "Aserbaidschan"], KAZ: ["kaz", "Kasachstan"], ISR: ["isr", "Israel"],
};
// UEFA-Länderkürzel (euro.js) → Nationalität
export const CC_NAT = { Eng: "ENG", Ita: "ITA", Esp: "ESP", Ger: "GER", Fra: "FRA", Por: "POR", Bel: "BEL", Ned: "NED", Tur: "TUR", Gre: "GRE", Cze: "CZE", Pol: "POL", Nor: "NOR", Den: "DEN", Cyp: "CYP",
  Sui: "SUI", Aut: "AUT", Hun: "HUN", Cro: "CRO", Swe: "SWE", Sco: "SCO", Rom: "ROU", Ukr: "UKR", Azb: "AZE", Isr: "ISR", Slo: "SVN", Svk: "SVK", Bul: "BUL", Srb: "SRB", Isl: "ISL", Irl: "IRL", Arm: "ARM",
  Lat: "LVA", Bos: "BIH", Kos: "KOS", Fin: "FIN", Kaz: "KAZ", Lie: "LIE", Mol: "MDA", Far: "FRO", Alb: "ALB", Mac: "MKD", Bls: "BLR", Lit: "LTU", Gib: "GIB", And: "AND", Mlt: "MLT", Est: "EST", Geo: "GEO",
  Nir: "NIR", Lux: "LUX", Mon: "MNE", Wal: "WAL", Sma: "SMR" };
// Ausländeranteil der Klubs je Land (50–80 %)
export const FOREIGN_SHARE = { Eng: 0.75, Ita: 0.65, Esp: 0.5, Fra: 0.6, Por: 0.72, Bel: 0.75, Ned: 0.55, Tur: 0.62, Gre: 0.72, Cyp: 0.8, Sco: 0.65, Aut: 0.55, Sui: 0.55, Azb: 0.7, Hun: 0.6 };
// Ausländeranteil in Deutschland je Spielklasse (Landesliga abwärts 5–10 %)
export const GER_FOREIGN = { 1: 0.55, 2: 0.42, 3: 0.3, 4: 0.22, 5: 0.15, 6: 0.1, 7: 0.08, 8: 0.07, 9: 0.06, 10: 0.05, 11: 0.05, 12: 0.05 };
// Herkunft ausländischer Profis (Profiligen) bzw. im Amateurbereich (Oberliga abwärts)
const W_PRO = { BRA: 10, FRA: 9, ARG: 6, ESP: 6, POR: 5, NED: 5, BEL: 4, ENG: 4, ITA: 3, GER: 4, CRO: 4, SRB: 3, SEN: 4, CIV: 4, NGA: 4, GHA: 3, CMR: 2, MLI: 2, MAR: 4, ALG: 2, USA: 3, MEX: 2, COL: 3, URU: 3, JPN: 3, KOR: 2,
  DEN: 3, NOR: 2, SWE: 2, POL: 3, TUR: 2, UKR: 2, CZE: 2, AUT: 3, SUI: 3, ALB: 2, KOS: 2, GRE: 1, HUN: 1, ISL: 1, GEO: 2, BIH: 2, SCO: 1, IRL: 1 };
const W_AMA = { TUR: 10, POL: 7, KOS: 5, ALB: 4, CRO: 4, ITA: 4, GRE: 3, BIH: 3, SRB: 3, UKR: 3, ROU: 3, POR: 2, MAR: 2, GHA: 2, ESP: 1, NGA: 1, NED: 1 };
const SPLIT = Object.fromEntries(Object.entries(P).map(([k, [f, l]]) => [k, [f.split(" ").filter(Boolean), [...new Set(l.split(" ").filter(Boolean).map((x) => x.replace(/_/g, " ")))]]]));
function pickW(rng, W, exclude) {
  const e = Object.entries(W).filter(([k]) => k !== exclude); let x = rng() * e.reduce((a, b) => a + b[1], 0);
  for (const [k, w] of e) { x -= w; if (x <= 0) return k; }
  return e[e.length - 1][0];
}
// ctx: { cc: UEFA-Kürzel des Klublandes (Standard Deutschland), level: Spielklasse, youth: eigene Jugend }
export function pickNat(rng, ctx = {}) {
  const home = CC_NAT[ctx.cc || "Ger"] || "GER";
  let share = home === "GER" ? GER_FOREIGN[Math.min(ctx.level || 6, 12)] ?? 0.05 : FOREIGN_SHARE[ctx.cc] ?? 0.55;
  if (ctx.youth) share *= 0.4;
  if (rng() >= share) return home;
  return pickW(rng, home === "GER" && (ctx.level || 6) >= 5 ? W_AMA : W_PRO, home);
}
export function natName(rng, nat) {
  const [f, l] = SPLIT[(NATS[nat] || NATS.GER)[0]];
  const last = l[Math.floor(rng() * l.length)];
  const first = f[Math.floor(rng() * f.length)];
  return first + " " + last;
}
