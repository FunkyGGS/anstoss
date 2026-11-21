# Erzeugt site/world.json aus den recherchierten Tabellen (Stand 21.11.2026).
# Reihenfolge je Liga = aktueller Tabellenstand (Platz 1 zuerst).
import json, re, unicodedata

L = []  # leagues

def league(id, name, level, group, verband, teams, extra=None):
    teams = [re.sub(r"\s*\((A|N|M)\)$", "", t).strip() for t in teams]
    d = dict(id=id, name=name, level=level, group=group, verband=verband, teams=teams)
    if extra: d.update(extra)
    L.append(d)

# ---------- Ebene 1-3 ----------
league("bl", "Bundesliga", 1, "bl", None, [
 "FC Bayern München","Borussia Dortmund","Bayer 04 Leverkusen","RB Leipzig","Eintracht Frankfurt",
 "VfB Stuttgart","SC Freiburg","TSG 1899 Hoffenheim","1. FSV Mainz 05","Borussia Mönchengladbach",
 "SV Werder Bremen","FC Augsburg","1. FC Köln","1. FC Union Berlin","FC Schalke 04","Hamburger SV",
 "SV 07 Elversberg","SC Paderborn 07"])
league("2bl", "2. Bundesliga", 2, "2bl", None, [
 "Hertha BSC","1. FC Nürnberg","1. FC Heidenheim","1. FC Magdeburg","VfL Wolfsburg","1. FC Kaiserslautern",
 "FC St. Pauli","Energie Cottbus","Arminia Bielefeld","VfL Osnabrück","Eintracht Braunschweig","VfL Bochum",
 "Hannover 96","SV Darmstadt 98","SpVgg Greuther Fürth","Dynamo Dresden","Karlsruher SC","Holstein Kiel"])
league("3l", "3. Liga", 3, "3l", None, [
 "Viktoria Köln","MSV Duisburg","Rot-Weiss Essen","SV Wehen Wiesbaden","FC Ingolstadt 04","1. FC Saarbrücken",
 "Alemannia Aachen","SV Waldhof Mannheim","TSG Hoffenheim II","FC Hansa Rostock","SV Meppen","VfB Stuttgart II",
 "Fortuna Düsseldorf","SC Preußen Münster","Würzburger Kickers","SSV Jahn Regensburg","SC Verl",
 "SG Sonnenhof Großaspach","SC Fortuna Köln","TSV Havelse"])

# ---------- Ebene 4 ----------
league("rl_n", "Regionalliga Nord", 4, "rl_n", None, [
 "Hannover 96 II","SC Weiche Flensburg 08","SV Drochtersen/Assel","1. FC Phönix Lübeck","VfB Oldenburg",
 "FSV Schöningen","Kickers Emden","VfB Lübeck","SV Atlas Delmenhorst","Eimsbütteler TV","SSV Jeddeloh II",
 "Hamburger SV II","SV Werder Bremen II","HSC Hannover","Bremer SV","SV Todesfelde","FC St. Pauli II",
 "Eintracht Norderstedt"])
league("rl_no", "Regionalliga Nordost", 4, "rl_no", None, [
 "FC Rot-Weiß Erfurt","Chemnitzer FC","BFC Dynamo","Hallescher FC","VSG Altglienicke","FC Erzgebirge Aue",
 "FC Carl Zeiss Jena","1. FC Lok Leipzig","Greifswalder FC","1. FC Magdeburg II","FSV Zwickau","SV Babelsberg 03",
 "BFC Preussen","BSG Chemie Leipzig","Hertha BSC II","SV Tasmania Berlin","RSV Eintracht Stahnsdorf","FSV 63 Luckenwalde"])
league("rl_w", "Regionalliga West", 4, "rl_w", None, [
 "Rot-Weiß Oberhausen","Borussia Dortmund II","Borussia Mönchengladbach II","FC Gütersloh","Sportfreunde Siegen",
 "Bonner SC","1. FC Köln II","Westfalia Rhynern","SC Paderborn 07 II","1. FC Bocholt","FC Schalke 04 II",
 "VfB Hilden","VfL Bochum II","SV Bergisch Gladbach 09","SV Rödinghausen","SG Wattenscheid 09",
 "SC Wiedenbrück","Sportfreunde Lotte"])
league("rl_sw", "Regionalliga Südwest", 4, "rl_sw", None, [
 "VfR Mannheim","SGV Heilbronn-Freiberg","VfR Aalen","Kickers Offenbach","Stuttgarter Kickers","Eintracht Trier",
 "TSV Steinbach Haiger","FC 08 Homburg","SC Freiburg II","SV Sandhausen","KSV Hessen Kassel","FC-Astoria Walldorf",
 "Eintracht Frankfurt II","FSV Frankfurt","1. FSV Mainz 05 II","SG Barockstadt Fulda-Lehnerz","SSV Ulm 1846",
 "1. FC Kaiserslautern II"])
league("rl_by", "Regionalliga Bayern", 4, "rl_by", "BAY", [
 "FC Memmingen","TSV Buchbach","TSV 1860 München","FV Illertissen","SpVgg Unterhaching","SpVgg Bayreuth",
 "1. FC Nürnberg II","FC Augsburg II","VfB Eichstätt","TSV Schwaben Augsburg","FC Bayern München II",
 "SV Wacker Burghausen","SC Eltersdorf","DJK Vilzing","1. FC Schweinfurt 05","SpVgg Ansbach","TSV Aubstadt",
 "SpVgg Greuther Fürth II","TSV Landsberg"])

# ---------- Ebene 5 ----------
league("ol_nds", "Oberliga Niedersachsen", 5, "ol_nds", "NDS", [
 "SV Wilhelmshaven","SC Spelle-Venhaus","Eintracht Braunschweig II","Heeslinger SC","BV Blau-Weiß Lohne",
 "BSV Schwarz-Weiß Rehden","VfV Borussia 06 Hildesheim","SV Meppen II","SV Vorwärts Nordhorn","FC Verden 04",
 "TuS Bersenbrück","Lüneburger SK Hansa","SV Drochtersen/Assel II","1. FC Germania Egestorf-Langreder",
 "SC Hemmingen-Westerfeld","SSV Vorsfelde"])
league("ol_hh", "Oberliga Hamburg", 5, "ol_hh", "HH", [
 "USC Paloma Hamburg","SC Victoria Hamburg","TuS Dassendorf","Niendorfer TSV","Hamburger Turnerschaft 1816",
 "Altona 93","SC Vorwärts/Wacker 04","TSV Sasel","Türk Birlikspor Pinneberg","ETSV Hamburg","FC Süderelbe",
 "FC Teutonia 05 Ottensen","Hamburg-Eimsbütteler BC","TSV Buchholz 08","WTSV Concordia","FK Nikola Tesla",
 "Eintracht Norderstedt II","TuRa Harksheide"])
league("ol_hb", "Bremen-Liga", 5, "ol_hb", "HB", [
 "Blumenthaler SV","OSC Bremerhaven","SV Hemelingen","Brinkumer SV","TV Eiche Horn","SG Aumund-Vegesack",
 "TuS Schwachhausen","FC Union 60 Bremen","Vatan Sport Bremen","ESC Geestemünde","SV Grohn","TS Woltmershausen",
 "Leher Turnerschaft","SV Werder Bremen III","Bremer TS Neustadt","FC Oberneuland"])
league("ol_sh", "Oberliga Schleswig-Holstein", 5, "ol_sh", "SH", [
 "Holstein Kiel II","VfR Neumünster","FC Kilia Kiel","SC Rapid Lübeck","TSB Flensburg","1. FC Phönix Lübeck II",
 "Heider SV","Oldenburger SV","TuS Rotenhof","TSV Nordmark Satrup","PSV Union Neumünster","Kaltenkirchener TS",
 "VfB Lübeck II","SV Eichede","MTSV Hohenwestedt","Eckernförder SV"])
league("ol_nofvn", "NOFV-Oberliga Nord", 5, "ol_nofvn", None, [
 "SV Siedenbollentin","Berliner AK 07","FC Mecklenburg Schwerin","FSV Optik Rathenow","1. FC Lok Stendal",
 "Eintracht Mahlsdorf","SV Lichtenberg 47","FC Anker Wismar","Füchse Berlin Reinickendorf","Tennis Borussia Berlin",
 "TuS Makkabi Berlin","SG Union Klosterfelde","TSG Neustrelitz","Hertha 03 Zehlendorf","SV Sparta Lichtenberg",
 "FC Hansa Rostock II"])
league("ol_nofvs", "NOFV-Oberliga Süd", 5, "ol_nofvs", None, [
 "VfB Germania Halberstadt","ZFC Meuselwitz","FC Eilenburg","VfL Halle 1896","SG Dynamo Dresden II","VfB Auerbach",
 "SG Union Sandersdorf","SSC Weißenfels","VFC Plauen","FC Einheit Wernigerode","SC Freital","FSV Budissa Bautzen",
 "FC Einheit Rudolstadt","VfB Empor Glauchau","VfB Krieschow","1. FC Frankfurt (Oder)"])
league("ol_wfl", "Oberliga Westfalen", 5, "ol_wfl", "WFL", [
 "1. FC Gievenbeck","Rot-Weiß Maaslingen","SV Lippstadt 08","FC Eintracht Rheine","SpVgg Erkenschwick","SC Verl II",
 "SpVgg Vreden","TSG Sprockhövel","Arminia Bielefeld II","TSV Victoria Clarholz","SC Westfalia Kinderhaus",
 "SC Preußen Münster II","DJK TuS Hordel","ASC 09 Dortmund","SpVgg Horsthausen","TuS Ennepetal","TuS Hiltrup",
 "SV Schermbeck 2020"])
league("ol_nrh", "Oberliga Niederrhein", 5, "ol_nrh", "NRH", [
 "SpVg Schonnebeck","Fortuna Düsseldorf II","Sportfreunde Baumberg","SC St. Tönis","KFC Uerdingen 05","SSVg Velbert",
 "1. FC Monheim","SV Sonsbeck","SV Blau-Weiß Dingden","Solingen 03","Ratingen 04/19","SV Scherpenberg",
 "Schwarz-Weiß Essen","FC Büderich","VfL Jüchen-Garzweiler","TSV Meerbusch","Holzheimer SG","Wuppertaler SV"])
league("ol_mrh", "Mittelrheinliga", 5, "ol_mrh", "MRH", [
 "SV Eintracht Hohkeppel","FC Wegberg-Beeck","SC Fortuna Köln II","VfL 08 Vichttal","FC Hürth","SSV Merten",
 "FSV Neunkirchen-Seelscheid","Borussia Lindenthal-Hohenlind","Siegburger SV 04","1. FC Düren","FC Hennef 05",
 "SSV Bornheim","SpVg Frechen 20","TuS Chlodwig Zülpich","SpVg Porz 1919","TuS Königsdorf"])
league("ol_rps", "Oberliga Rheinland-Pfalz/Saar", 5, "ol_rps", None, [
 "TuS Mechtersheim","TSV Schott Mainz","FC Rot-Weiß Koblenz","FV Engers 07","TuS Koblenz","FC Emmelshausen-Karbach",
 "TSV Gau-Odernheim","Wormatia Worms","FK Pirmasens","SV Gonsenheim","SV Rot-Weiss Wittlich","SV Auersmacher",
 "SV 07 Elversberg II","FC Hertha Wiesbach","FC Cosmos Koblenz","FV 07 Diefflen","Ahrweiler BC",
 "Eisbachtaler Sportfreunde"])
league("ol_hes", "Hessenliga", 5, "ol_hes", "HES", [
 "SV Unter-Flockenbach","FC Eddersheim","TSV Eintracht Stadtallendorf","FC TuBa Pohlheim","VfB Marburg",
 "SV Rot-Weiß Hadamar","Hünfelder SV","Türk Gücü Friedberg","SV Darmstadt 98 II","FSV 1926 Fernwald","CSC 03 Kassel",
 "KSV Hessen Kassel II","KSV Baunatal","Rot-Weiß Walldorf","FC Bayern Alzenau","SC 1960 Hanau","FC Gießen",
 "SV Hummetroth"])
league("ol_bw", "Oberliga Baden-Württemberg", 5, "ol_bw", None, [
 "SV Oberachern","SSV Reutlingen 05","TSG Backnang 1919","FC 08 Villingen","1. FC Mühlhausen","Young Boys Reutlingen",
 "1. CfR Pforzheim","FC Holzhausen","Bahlinger SC","FV Ravensburg","Türkspor Neckarsulm","TSG Balingen",
 "Türkischer SV Singen","Karlsruher SC II","FC Teningen","TSV Essingen","FC Nöttingen","1. FC Normannia Gmünd"])
league("ol_byn", "Bayernliga Nord", 5, "ol_byn", "BAY", [
 "ASV Cham","DJK Gebenbach","FC Eintracht Bamberg","SpVgg Bayern Hof","TSV Kornburg","SSV Jahn Regensburg II",
 "SV Fortuna Regensburg","Würzburger FV","Viktoria Aschaffenburg","FSV Stadeln","TSV Neudrossenfeld",
 "SpVgg SV Weiden","TSV Großbardorf","FC Ingolstadt 04 II","TSV 1861 Nördlingen","DJK Ammerthal",
 "DJK Don Bosco Bamberg","ASV Neumarkt"])
league("ol_bys", "Bayernliga Süd", 5, "ol_bys", "BAY", [
 "FC Pipinsried","SpVgg Landshut","SpVgg Hankofen-Hailing","SV Erlbach","TSV 1880 Wasserburg","FSV Pfaffenhofen",
 "FC Sportfreunde Schwaig","FC Ismaning","TSV 1860 München II","FC Gundelfingen","SV Heimstetten","FC Deisenhofen",
 "TSV 1860 Rosenheim","TSV Schwabmünchen","SV Kirchanschöring","TSV Kottern","TuS Geretsried","SV Schalding-Heining"])

# ---------- Ebene 6 (nur Niedersachsen) ----------
league("ll_han", "Landesliga Hannover", 6, "ll_han", "NDS", [
 "SV Ramlingen-Ehlershausen","TSV Krähenwinkel/Kaltenweide","SSG Halvestorf-Herkendorf","TSV Mühlenfeld",
 "SV Arminia Hannover","SV Bavenstedt","1. FC Wunstorf","TSV Wetschen","VfR Evesen","SV Iraklis Hellas",
 "TSV Pattensen","OSV Hannover","SV BW Neuhof","SG v. 1874 Hannover","TSV Godshorn"])
league("ll_bs", "Landesliga Braunschweig", 6, "ll_bs", "NDS", [
 "MTV Wolfenbüttel","1. SC Göttingen 05","U.S.I. Lupo-Martini Wolfsburg","FC Germania Bleckenstedt","SSV Kästorf",
 "Bovender SV","FC Eintracht Northeim","SVG Göttingen 07","FT Braunschweig","MTV Gifhorn","SC Rot-Weiß Volkmarode",
 "TSV Landolfshausen/Seulingen","VfB Fallersleben","Lehndorfer TSV","SSV Vorsfelde II","TSG Bad Harzburg"])
league("ll_lg", "Landesliga Lüneburg", 6, "ll_lg", "NDS", [
 "MTV Eintracht Celle","Blau-Weiß Bornreihe","SV Ahlerstedt/Ottendorf","FC Hagen/Uthlede","SV Lindwedel-Hope",
 "TSV Elstorf","Rotenburger SV","TuS Harsefeld","VSK Osterholz-Scharmbeck","SG Scharmbeck-Pattensen-Ashausen",
 "MTV Treubund Lüneburg","TV Jahn Schneverdingen","SV Vorwärts Hülsen","MTV Römstedt","TSV Etelsen","FC Cuxhaven"])
league("ll_we", "Landesliga Weser-Ems", 6, "ll_we", "NDS", [
 "SV Eintracht Nordhorn","BV Garrel","SV Grün-Weiß Mühlen","SC Melle 03","FC Schüttorf 09","SV Bevern","TV Dinklage",
 "TuS Pewsum","SC Blau-Weiß 94 Papenburg","VfL Oldenburg","SV Holthausen/Biene","SV Union Lohne",
 "BV Blau-Weiß Lohne II","SV Altenoythe","Blau-Weiß Hollage","VfL Wittekind Wildeshausen"])

# ---------- Ebene 7: Bezirksliga Hannover ----------
league("bzl1", "Bezirksliga Hannover 1", 7, "bzl_han", "NDS", [
 "STK Eilvese","SC Twistringen","TuS Wagenfeld","SV Bruchhausen-Vilsen","SV Weyhe","SV Germania Helstorf",
 "TSG Seckenhausen-Fahrenhorst","SV Esperke","SV Blau-Elf Steimbke","FC Sulingen","TV Neuenkirchen","TuS Sudweyhe",
 "TuS Leese","SG Hoya","SV Grün-Weiß Stöckse","RSV Rehburg"])
league("bzl2", "Bezirksliga Hannover 2", 7, "bzl_han", "NDS", [
 "SpVgg Niedersachsen Döhren","SV Ramlingen-Ehlershausen II","TSV Stelingen","TuS Garbsen","SF Anderten",
 "SV Germania Grasdorf","FC Lehrte","MTV Ilten","SC Wedemark","TSV Krähenwinkel/Kaltenweide II",
 "MTV Engelbostel-Schulenburg","SC Hemmingen-Westerfeld II","TSV Bemerode","TSV Burgdorf","OSV Hannover II"])
league("bzl3", "Bezirksliga Hannover 3", 7, "bzl_han", "NDS", [
 "VfL Bückeburg","SV Arnum","TSV Barsinghausen","SV Eintracht Afferde","SV Ihme-Roloven","FC Springe","MTV Rehren A/R",
 "FC Bad Pyrmont Hagen","TuS Jahn Lindhorst","TSV Kirchdorf","TuS Schwarz-Weiß Enzen","TV Jahn Leveste","FC Hevesen",
 "TB Hilligsfeld","HSC BW Tündern","SC Rinteln","SV Gehrden"])
league("bzl4", "Bezirksliga Hannover 4", 7, "bzl_han", "NDS", [
 "VfR Germania Ochtersum","FC Eldagsen","SV Türk Gücü Hildesheim","TSV Giesen","SC Harsum","MTV Almstedt","SV Alfeld",
 "SV Newroz Hildesheim","VfL Borsum","SV Ambergau Bockenem","TuS GW Himmelsthür","SCM Bodenwerder","SC Drispenstedt",
 "TuS Hasede","BW Salzhemmendorf","TuSpo Schliekum","SV RW Ahrbergen"])

# ---------- Kreis Region Hannover ----------
league("rh_kl1", "Kreisliga Region Hannover 1", 8, "rh_kl", "NDS", [
 "Heesseler SV","TSG Ahlten","SV Uetze 08","TuS Altwarmbüchen","SV 06 Lehrte","TSV Dollbergen","Srpski FK Hannover",
 "SV Sorgensen","SG Adler/TSV 03 Isernhagen","MTV Immensen","TSV Krähenwinkel/Kaltenweide III","SuS Sehnde",
 "TSV Isernhagen","FC Burgwedel"])
league("rh_kl2", "Kreisliga Region Hannover 2", 8, "rh_kl", "NDS", [
 "TSV Poggenhagen","TSV Kolenfeld","TSV Berenbostel","SV Türkay Sport Garbsen","Türkspor Wunstorf","TSV Luthe",
 "1. FC Brelingen","TSV Godshorn II","Mellendorfer TV","TSV Stelingen II","SG Blau-Gelb Elze","SV Frielingen",
 "TSV Mariensee-Wulfelade","SV Resse","SV Butteramt","SG Letter 05"])
league("rh_kl3", "Kreisliga Region Hannover 3", 8, "rh_kl", "NDS", [
 "TSV Pattensen II","SV Weetzen","SV Degersen","SpVg Laatzen","VSV Hohenbostel","TuS Seelze","BSV Gleidingen",
 "TuS Wettbergen","TSV Goltern","TSV Wennigsen","TSV Barsinghausen II","SpVg Hüpede-Oerie","SG 05 Ronnenberg",
 "1. FC Germania Egestorf-Langreder II","Mühlenberger SV","Koldinger SV"])
league("rh_kl4", "Kreisliga Region Hannover 4", 8, "rh_kl", "NDS", [
 "SV Borussia Hannover","TSV Kirchrode","SG Blaues Wunder","HSC Hannover II","TuS Kleefeld","SV Croatia Hannover",
 "VfL Eintracht Hannover","SG v. 1874 Hannover II","TSV Fortuna Sachsenross","SV 07 Linden","FC Can Mozaik",
 "FC Stern Misburg","TuS Mecklenheide","Zeder SV","TuS Davenstedt II","SG Limmer"])
league("rh_kk1_1", "1. Kreisklasse Region Hannover 1", 9, "rh_kk1", "NDS", [
 "FC Neuwarmbüchen","TuS Röddensen","TSV Wettmar","TSV Germania Haimar Dolgen","TSV Arpke","TSV Obershagen",
 "SV Yurdumspor Lehrte","SV Fuhrberg","FSC Bolzum-Wehmingen","Mellendorfer TV II","TSG Ahlten II",
 "SV Ramlingen-Ehlershausen III","SV 06 Lehrte II","MTV Ilten II"])
league("rh_kk1_2", "1. Kreisklasse Region Hannover 2", 9, "rh_kk1", "NDS", [
 "TSV Mühlenfeld II","TSV Schloß Ricklingen","Afrikanischer SV Hannover","SV Eintracht Suttorf","SV Wacker Osterwald",
 "STK Eilvese II","DJK Sparta Langenhagen","TuS Garbsen II","Inter Roj Wunstorf","FC Wacker Neustadt","SC Langenhagen",
 "TSV Klein Heidorn","Autertaler SC","FC Mecklenhorst"])
league("rh_kk1_3", "1. Kreisklasse Region Hannover 3", 9, "rh_kk1", "NDS", [
 "SV Arnum II","TSV Kirchdorf II","FC Bennigsen","TSV Pattensen III","TSV Ingeln-Oesselse","Badenstedter SC",
 "FC Eldagsen II","FC Hannover Stars","TuS Wettbergen II","SV Ihme-Roloven II","SV Weetzen II",
 "SG Kirchwehren/Lathwehren","TSV Groß Munzel","TSV Goltern II"])
league("rh_kk1_4", "1. Kreisklasse Region Hannover 4", 9, "rh_kk1", "NDS", [
 "SpVgg Niedersachsen Döhren II","SV Bosna Sandzak","SC Polonia Hannover","SF Anderten II","VfL Eintracht Hannover II",
 "TSV Bemerode II","Polizei SV Hannover","SC Elite Hannover","SG Blaues Wunder II","TSV Saxonia Hannover",
 "SV 07 Linden II","SG Letter 05 II","TuS Ricklingen"])
league("rh_kk2_1", "2. Kreisklasse Region Hannover 1", 10, "rh_kk2", "NDS", [
 "TSV Engensen","SuS Sehnde II","MTV Rethmar","SG Adler/TSV 03 Isernhagen II","Heesseler SV II","SF Aligse",
 "SV Hertha Otze","TuS Schwüblingsen","MTV Eintracht Dedenhausen","SV Uetze 08 II","TSV Burgdorf II",
 "TSV Obershagen II","SV Sorgensen II"])
league("rh_kk2_2", "2. Kreisklasse Region Hannover 2", 10, "rh_kk2", "NDS", [
 "TSV Berenbostel II","SV Dedensen","1. FC Wunstorf II","SG Blau-Gelb Elze II","TSV Luthe II","Srpski FK Hannover II",
 "TSV Kolenfeld II","SG Mardorf-Schneeren","SC Wedemark II","TSV Bordenau","SC Steinhude","TuS Gümmer",
 "TSV Schloß Ricklingen II"])
league("rh_kk2_3", "2. Kreisklasse Region Hannover 3", 10, "rh_kk2", "NDS", [
 "TSV Gestorf","SC Hemmingen-Westerfeld III","SV Germania Grasdorf II","SV Arnum III","SV Northen-Lenthe","FC Springe II",
 "TV Jahn Leveste II","SV Wilkenburg","FC Eldagsen III","BSV Gleidingen II","TSV Bantorf","Lohnder SC","SV Velber"])
league("rh_kk2_4", "2. Kreisklasse Region Hannover 4", 10, "rh_kk2", "NDS", [
 "TuS Marathon Hannover","SV Kleeblatt Stöcken","SG Limmer II","BV Werder Hannover","SV Odin Hannover",
 "LSV Alexandria Hannover","TuS Kleefeld II","TSV Kirchrode II","SV Afro 237","SF Anderten III",
 "VfL Eintracht Hannover III","SV Arminia Hannover II","Zeder SV II"])
league("rh_kk3_1", "3. Kreisklasse Region Hannover 1", 11, "rh_kk3", "NDS", [
 "TuS Röddensen II","PSV Rot-Gold Lehrte","SV 06 Lehrte III","TSV Bemerode III","SV Borussia Hannover III",
 "TuS Altwarmbüchen II","TSG Ahlten III","SF Anderten IV","TSV Friesen Hänigsen","SSV Kirchhorst",
 "DJK Sparta Langenhagen II","TSV Arpke II"])
league("rh_kk3_2", "3. Kreisklasse Region Hannover 2", 11, "rh_kk3", "NDS", [
 "Garbsener SC","SV Türkay Sport Garbsen II","MTV Engelbostel-Schulenburg II","TSV Mühlenfeld III","SC Ayyildiz",
 "Türkspor Wunstorf II","SG Mandelsloh/Esperke","TSV Berenbostel III","TuS Seelze II","TSV Mariensee-Wulfelade II",
 "SV Wacker Osterwald II"])
league("rh_kk3_3", "3. Kreisklasse Region Hannover 3", 11, "rh_kk3", "NDS", [
 "FC Rethen","SG Deister Bredenbeck/Holtensen Wennigsen","SV Degersen II","SG Schulenburg/Jeinsen","SG Everloh-Ditterke",
 "SV Steinkrug","SG 05 Ronnenberg II","BSV Gleidingen III","TSV Kirchdorf III","Koldinger SV II","SV Mittelrode",
 "SV Borussia Hannover IV","MTV Lemmie"])
league("rh_kk3_4", "3. Kreisklasse Region Hannover 4", 11, "rh_kk3", "NDS", [
 "TuS Mecklenheide II","TSV Fortuna Sachsenross II","LSV Alexandria Hannover II","TuS Marathon Hannover II",
 "SG v. 1874 Hannover III","SV Borussia Hannover II","VfB Wülfel","TV Badenstedt","Mühlenberger SV II","SV Ahlem",
 "VfV 87 Hainholz","FC Stern Misburg II"])

# ---------- Kreis Hameln-Pyrmont ----------
league("hm_kl", "Kreisliga Hameln-Pyrmont", 8, "hm_kl", "NDS", [
 "TSV Nettelrede","SSV Königsförde","TSG Emmerthal","FC Preussen Hameln 07","MTSV Aerzen","SV Hajen","FC Saale-Ith",
 "TSV Klein Berkel","TSV Bisperode","HSC BW Tündern II","FC Flegessen-Hasperde","VfB Hemeringen","TSV Grohnde",
 "TuS Rohden-Segelhorst"])
league("hm_kk1", "1. Kreisklasse Hameln-Pyrmont", 9, "hm_kk1", "NDS", [
 "SV Azadi Hameln","FC Bad Pyrmont Hagen II","TSC Fischbeck","SV Germania Beber-Rohrsen","TSV Germania Reher",
 "SSG Halvestorf-Herkendorf II","SSG Marienau","SC Rot-Weiss Thal","MTSV Aerzen II","SF Osterwald",
 "FC Preussen Hameln 07 II","BW Salzhemmendorf II","TSV Nettelrede II","SG Hameln 74"])
league("hm_kk2", "2. Kreisklasse Hameln-Pyrmont", 10, "hm_kk2", "NDS", [
 "TuSpo Bad Münder","FC Kosova Hameln","TSV Eintracht Nienstedt","SG Afferde-Hilligsfeld","SG Eimbeckhausen/Hamelspringe",
 "SV Lachem-Haverbeck","TSV 05 Groß Berkel","TSG Emmerthal II","SG Flegessen/Süntel II","SC Börry","SC Weser HO II",
 "TSV Klein Berkel II","VfB Hemeringen II","MTV Coppenbrügge"])
league("hm_kk3", "3. Kreisklasse Hameln-Pyrmont", 11, "hm_kk3", "NDS", [
 "TSC Fischbeck II","SV Hajen II","SG Afferde-Hilligsfeld II","TSV Bisperode II","SG Thal/Holzhausen II","SG Lüntorf",
 "TSV Germania Reher II","SSG Marienau II","SF Osterwald II"])

# ---------- Verbände ----------
V = {}
def setv(v, names):
    for n in names: V[n] = v
setv("BAY", ["FC Bayern München","FC Augsburg","1. FC Nürnberg","SpVgg Greuther Fürth","FC Ingolstadt 04","Würzburger Kickers","SSV Jahn Regensburg","FC Bayern Alzenau"])
setv("WFL", ["Borussia Dortmund","FC Schalke 04","SC Paderborn 07","Arminia Bielefeld","VfL Bochum","SC Preußen Münster","SC Verl"])
setv("MRH", ["Bayer 04 Leverkusen","1. FC Köln","Viktoria Köln","Alemannia Aachen","SC Fortuna Köln"])
setv("NRH", ["Borussia Mönchengladbach","MSV Duisburg","Rot-Weiss Essen","Fortuna Düsseldorf"])
setv("SN", ["RB Leipzig","Dynamo Dresden"]); setv("HES", ["Eintracht Frankfurt","SV Darmstadt 98","SV Wehen Wiesbaden"])
setv("WUE", ["VfB Stuttgart","1. FC Heidenheim","SG Sonnenhof Großaspach"]); setv("SBD", ["SC Freiburg"])
setv("BAD", ["TSG 1899 Hoffenheim","Karlsruher SC","SV Waldhof Mannheim"]); setv("SW", ["1. FSV Mainz 05","1. FC Kaiserslautern"])
setv("HB", ["SV Werder Bremen"]); setv("B", ["1. FC Union Berlin","Hertha BSC"]); setv("HH", ["Hamburger SV","FC St. Pauli"])
setv("SAA", ["SV 07 Elversberg","1. FC Saarbrücken"]); setv("ST", ["1. FC Magdeburg"]); setv("BB", ["Energie Cottbus"])
setv("NDS", ["VfL Wolfsburg","VfL Osnabrück","Eintracht Braunschweig","Hannover 96","SV Meppen","TSV Havelse"])
setv("SH", ["Holstein Kiel"]); setv("MV", ["FC Hansa Rostock"])
# Regionalligen
setv("NDS", ["SV Drochtersen/Assel","VfB Oldenburg","FSV Schöningen","Kickers Emden","SV Atlas Delmenhorst","SSV Jeddeloh II","HSC Hannover"])
setv("SH", ["SC Weiche Flensburg 08","1. FC Phönix Lübeck","VfB Lübeck","SV Todesfelde"])
setv("HH", ["Eimsbütteler TV","Eintracht Norderstedt"]); setv("HB", ["Bremer SV"])
setv("TH", ["FC Rot-Weiß Erfurt","FC Carl Zeiss Jena"]); setv("SN", ["Chemnitzer FC","FC Erzgebirge Aue","1. FC Lok Leipzig","FSV Zwickau","BSG Chemie Leipzig"])
setv("B", ["BFC Dynamo","VSG Altglienicke","BFC Preussen","SV Tasmania Berlin"]); setv("ST", ["Hallescher FC"])
setv("MV", ["Greifswalder FC"]); setv("BB", ["SV Babelsberg 03","RSV Eintracht Stahnsdorf","FSV 63 Luckenwalde"])
setv("NRH", ["Rot-Weiß Oberhausen","1. FC Bocholt","VfB Hilden"]); setv("MRH", ["Bonner SC","SV Bergisch Gladbach 09"])
setv("WFL", ["FC Gütersloh","Sportfreunde Siegen","Westfalia Rhynern","SV Rödinghausen","SG Wattenscheid 09","SC Wiedenbrück","Sportfreunde Lotte"])
setv("BAD", ["VfR Mannheim","SV Sandhausen","FC-Astoria Walldorf"]); setv("WUE", ["SGV Heilbronn-Freiberg","VfR Aalen","Stuttgarter Kickers","SSV Ulm 1846"])
setv("HES", ["Kickers Offenbach","TSV Steinbach Haiger","KSV Hessen Kassel","FSV Frankfurt","SG Barockstadt Fulda-Lehnerz"])
setv("RHL", ["Eintracht Trier"]); setv("SAA", ["FC 08 Homburg"])
# Oberligen mit mehreren Verbänden
setv("MV", ["SV Siedenbollentin","FC Mecklenburg Schwerin","FC Anker Wismar","TSG Neustrelitz"])
setv("B", ["Berliner AK 07","Eintracht Mahlsdorf","SV Lichtenberg 47","Füchse Berlin Reinickendorf","Tennis Borussia Berlin","TuS Makkabi Berlin","Hertha 03 Zehlendorf","SV Sparta Lichtenberg"])
setv("BB", ["FSV Optik Rathenow","SG Union Klosterfelde","VfB Krieschow","1. FC Frankfurt (Oder)"]); setv("ST", ["1. FC Lok Stendal","VfB Germania Halberstadt","VfL Halle 1896","SG Union Sandersdorf","SSC Weißenfels","FC Einheit Wernigerode"])
setv("TH", ["ZFC Meuselwitz","FC Einheit Rudolstadt"]); setv("SN", ["FC Eilenburg","VfB Auerbach","VFC Plauen","SC Freital","FSV Budissa Bautzen","VfB Empor Glauchau"])
setv("SW", ["TuS Mechtersheim","TSV Schott Mainz","TSV Gau-Odernheim","Wormatia Worms","FK Pirmasens","SV Gonsenheim"])
setv("RHL", ["FC Rot-Weiß Koblenz","FV Engers 07","TuS Koblenz","FC Emmelshausen-Karbach","SV Rot-Weiss Wittlich","FC Cosmos Koblenz","Ahrweiler BC","Eisbachtaler Sportfreunde"])
setv("SAA", ["SV Auersmacher","FC Hertha Wiesbach","FV 07 Diefflen"])
setv("SBD", ["SV Oberachern","FC 08 Villingen","Bahlinger SC","Türkischer SV Singen","FC Teningen"])
setv("BAD", ["1. FC Mühlhausen","1. CfR Pforzheim","FC Nöttingen"])
setv("WUE", ["SSV Reutlingen 05","TSG Backnang 1919","Young Boys Reutlingen","FC Holzhausen","FV Ravensburg","Türkspor Neckarsulm","TSG Balingen","TSV Essingen","1. FC Normannia Gmünd"])

OL_OF_VERBAND = {"NDS":"ol_nds","HH":"ol_hh","HB":"ol_hb","SH":"ol_sh","B":"ol_nofvn","MV":"ol_nofvn","BB":"ol_nofvn",
 "SN":"ol_nofvs","ST":"ol_nofvs","TH":"ol_nofvs","WFL":"ol_wfl","NRH":"ol_nrh","MRH":"ol_mrh","SW":"ol_rps","RHL":"ol_rps",
 "SAA":"ol_rps","HES":"ol_hes","BAD":"ol_bw","SBD":"ol_bw","WUE":"ol_bw","BAY":"ol_bys"}
RL_OF_OL = {"ol_nds":"rl_n","ol_hh":"rl_n","ol_hb":"rl_n","ol_sh":"rl_n","ol_nofvn":"rl_no","ol_nofvs":"rl_no",
 "ol_wfl":"rl_w","ol_nrh":"rl_w","ol_mrh":"rl_w","ol_rps":"rl_sw","ol_hes":"rl_sw","ol_bw":"rl_sw","ol_byn":"rl_by","ol_bys":"rl_by"}
BAY_NORD = {"1. FC Nürnberg","SpVgg Greuther Fürth","Würzburger Kickers","SSV Jahn Regensburg","FC Ingolstadt 04","SpVgg Bayreuth",
 "1. FC Schweinfurt 05","TSV Aubstadt","SC Eltersdorf","SpVgg Ansbach","DJK Vilzing","VfB Eichstätt"}
# Brandenburger Süd-Klubs
SUED_BB = {"VfB Krieschow","1. FC Frankfurt (Oder)","Energie Cottbus","FSV 63 Luckenwalde"}

# Bezirk (Niedersachsen) und Kreis
BEZ = {}
def setb(b, names):
    for n in names: BEZ[n] = b
setb("BS", ["VfL Wolfsburg","Eintracht Braunschweig","FSV Schöningen","Eintracht Braunschweig II","SSV Vorsfelde"])
setb("WE", ["VfL Osnabrück","SV Meppen","VfB Oldenburg","Kickers Emden","SV Atlas Delmenhorst","SSV Jeddeloh II",
 "SV Wilhelmshaven","SC Spelle-Venhaus","BV Blau-Weiß Lohne","SV Meppen II","SV Vorwärts Nordhorn","TuS Bersenbrück"])
setb("LG", ["SV Drochtersen/Assel","Heeslinger SC","FC Verden 04","Lüneburger SK Hansa","SV Drochtersen/Assel II"])
setb("HAN", ["Hannover 96","TSV Havelse","Hannover 96 II","HSC Hannover","BSV Schwarz-Weiß Rehden","VfV Borussia 06 Hildesheim",
 "1. FC Germania Egestorf-Langreder","SC Hemmingen-Westerfeld"])
KREIS = {}
def setk(k, names):
    for n in names: KREIS[n] = k
setk("RH", ["Hannover 96","TSV Havelse","Hannover 96 II","HSC Hannover","1. FC Germania Egestorf-Langreder","SC Hemmingen-Westerfeld",
 "SV Ramlingen-Ehlershausen","TSV Krähenwinkel/Kaltenweide","TSV Mühlenfeld","SV Arminia Hannover","1. FC Wunstorf",
 "SV Iraklis Hellas","TSV Pattensen","OSV Hannover","SG v. 1874 Hannover","TSV Godshorn",
 "STK Eilvese","SV Germania Helstorf","SV Esperke",
 "SV Arnum","TSV Barsinghausen","SV Ihme-Roloven","FC Springe","TSV Kirchdorf","TV Jahn Leveste","SV Gehrden","FC Eldagsen"])
for n in L[[l["id"] for l in L].index("bzl2")]["teams"]: KREIS[n] = "RH"
setk("HM", ["SSG Halvestorf-Herkendorf","SV Eintracht Afferde","FC Bad Pyrmont Hagen","TB Hilligsfeld","HSC BW Tündern","BW Salzhemmendorf"])

def norm(n):
    s = unicodedata.normalize("NFKC", n).lower()
    s = re.sub(r"[\-./()]", " ", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s
SUFFIX = re.compile(r"^(.*?)(?:\s+(ii|iii|iv|2|3|i))(?:\s+u2[13]|\s+u21)?$")
ALIAS = {
 "borussia mönchengladbach":"Borussia Mönchengladbach","werder bremen":"SV Werder Bremen","sv werder bremen":"SV Werder Bremen",
 "tsg hoffenheim":"TSG 1899 Hoffenheim","tsv krähenwinkel kaltenw":"TSV Krähenwinkel/Kaltenweide",
 "sg adler tsv 03 isernhagen":"SG Adler/TSV 03 Isernhagen","sg blau gelb elze":"SG Blau-Gelb Elze",
 "tsv fortuna sachsenross":"TSV Fortuna Sachsenross","djk sparta langenhagen":"DJK Sparta Langenhagen",
 "sv arminia hannover":"SV Arminia Hannover","hsc bw tündern":"HSC BW Tündern","fc bad pyrmont hagen":"FC Bad Pyrmont Hagen",
 "bw salzhemmendorf":"BW Salzhemmendorf","tsv klein berkel":"TSV Klein Berkel","sv hajen":"SV Hajen",
 "bv blau weiß lohne":"BV Blau-Weiß Lohne","sg dynamo dresden":"Dynamo Dresden",
}

teams = []; byname = {}
for lg in L:
    for pos, n in enumerate(lg["teams"]):
        if n in byname: raise SystemExit("doppelt: " + n)
        t = dict(name=n, league=lg["id"], pos=pos, n=len(lg["teams"]))
        teams.append(t); byname[n] = t

normmap = {norm(t["name"]): t["name"] for t in teams}
for t in teams:
    m = SUFFIX.match(norm(t["name"]))
    t["parent"] = None
    if m:
        base = m.group(1)
        cand = ALIAS.get(base) or normmap.get(base)
        if cand and cand != t["name"]:
            t["parent"] = cand
# Sonderfälle: SSV Jeddeloh II ist die erste Mannschaft
byname["SSV Jeddeloh II"]["parent"] = None

lgby = {l["id"]: l for l in L}
for t in teams:
    lg = lgby[t["league"]]
    root = t["parent"] or t["name"]
    v = V.get(root) or lg["verband"] or V.get(t["name"])
    if not v:
        # Oberliga-Verband ableiten
        raise SystemExit("kein Verband: " + t["name"])
    t["verband"] = v
for t in teams:
    lg = lgby[t["league"]]; root = t["parent"] or t["name"]
    level = lg["level"]
    home = {1: "bl", 2: "2bl", 3: "3l"}
    # Oberliga-Heimat
    if level == 5: ol = lg["group"]
    elif level >= 6: ol = "ol_nds"
    else:
        ol = OL_OF_VERBAND[t["verband"]]
        if t["verband"] == "BAY" and (root in BAY_NORD or root.startswith("1. FC Nürnberg")): ol = "ol_byn"
        if t["verband"] == "BB" and root in SUED_BB: ol = "ol_nofvs"
    rp = byname.get(root)
    if rp and lgby[rp["league"]]["level"] == 5: ol = lgby[rp["league"]]["group"]
    home[5] = ol; home[4] = RL_OF_OL[ol]
    if level == 4: home[4] = lg["group"]
    bez = BEZ.get(root) or BEZ.get(t["name"])
    kreis = KREIS.get(root) or KREIS.get(t["name"])
    if level == 6: bez = {"ll_han":"HAN","ll_bs":"BS","ll_lg":"LG","ll_we":"WE"}[lg["group"]]
    if level >= 7: bez = "HAN"
    if lg["group"].startswith("rh_"): kreis = "RH"
    if lg["group"].startswith("hm_"): kreis = "HM"
    if t["verband"] == "NDS" and bez:
        home[6] = {"HAN":"ll_han","BS":"ll_bs","LG":"ll_lg","WE":"ll_we"}[bez]
    if bez == "HAN": home[7] = "bzl_han"
    if kreis in ("RH","HM"):
        k = kreis.lower()
        home[8] = k+"_kl"; home[9] = k+"_kk1"; home[10] = k+"_kk2"; home[11] = k+"_kk3"
    t["home"] = home; t["bezirk"] = bez; t["kreis"] = kreis

out = dict(
  version="2026-11-21",
  source="kicker.de, fussball.de, Wikipedia (Tabellenstand 21.11.2026)",
  leagues=[{k: l[k] for k in ("id","name","level","group")} for l in L],
  teams=[dict(name=t["name"], league=t["league"], pos=t["pos"], parent=t["parent"], verband=t["verband"],
              bezirk=t["bezirk"], kreis=t["kreis"], home=t["home"]) for t in teams],
)
json.dump(out, open("site/world.json","w",encoding="utf8"), ensure_ascii=False, separators=(",",":"))
print(len(L), "Ligen,", len(teams), "Teams,", sum(1 for t in teams if t["parent"]), "Zweit-/Drittmannschaften")
from collections import Counter
print(Counter(t["verband"] for t in teams))
for t in teams:
    if re.search(r"\s(II|III|IV)\b", t["name"]) and not t["parent"]: print("ohne Stammverein:", t["name"])
