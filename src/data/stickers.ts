import type { Section, Sticker } from '../types';

// ─── Team definitions (album order) ──────────────────────────────────────────
const TEAMS: { abbrev: string; name: string; namePt: string }[] = [
  { abbrev: 'MEX', name: 'Mexico',             namePt: 'México' },
  { abbrev: 'RSA', name: 'South Africa',        namePt: 'África do Sul' },
  { abbrev: 'KOR', name: 'Korea Republic',      namePt: 'Coreia do Sul' },
  { abbrev: 'CZE', name: 'Czechia',             namePt: 'República Tcheca' },
  { abbrev: 'CAN', name: 'Canada',              namePt: 'Canadá' },
  { abbrev: 'BIH', name: 'Bosnia-Herzegovina',  namePt: 'Bósnia-Herzegovina' },
  { abbrev: 'QAT', name: 'Qatar',               namePt: 'Catar' },
  { abbrev: 'SUI', name: 'Switzerland',         namePt: 'Suíça' },
  { abbrev: 'BRA', name: 'Brazil',              namePt: 'Brasil' },
  { abbrev: 'MAR', name: 'Morocco',             namePt: 'Marrocos' },
  { abbrev: 'HAI', name: 'Haiti',               namePt: 'Haiti' },
  { abbrev: 'SCO', name: 'Scotland',            namePt: 'Escócia' },
  { abbrev: 'USA', name: 'USA',                 namePt: 'EUA' },
  { abbrev: 'PAR', name: 'Paraguay',            namePt: 'Paraguai' },
  { abbrev: 'AUS', name: 'Australia',           namePt: 'Austrália' },
  { abbrev: 'TUR', name: 'Türkiye',             namePt: 'Turquia' },
  { abbrev: 'GER', name: 'Germany',             namePt: 'Alemanha' },
  { abbrev: 'CUW', name: 'Curaçao',             namePt: 'Curaçao' },
  { abbrev: 'CIV', name: "Cote d'Ivoire",       namePt: 'Costa do Marfim' },
  { abbrev: 'ECU', name: 'Ecuador',             namePt: 'Equador' },
  { abbrev: 'NED', name: 'Netherlands',         namePt: 'Países Baixos' },
  { abbrev: 'JPN', name: 'Japan',               namePt: 'Japão' },
  { abbrev: 'SWE', name: 'Sweden',              namePt: 'Suécia' },
  { abbrev: 'TUN', name: 'Tunisia',             namePt: 'Tunísia' },
  { abbrev: 'BEL', name: 'Belgium',             namePt: 'Bélgica' },
  { abbrev: 'EGY', name: 'Egypt',               namePt: 'Egito' },
  { abbrev: 'IRN', name: 'IR Iran',             namePt: 'Irã' },
  { abbrev: 'NZL', name: 'New Zealand',         namePt: 'Nova Zelândia' },
  { abbrev: 'ESP', name: 'Spain',               namePt: 'Espanha' },
  { abbrev: 'CPV', name: 'Cabo Verde',          namePt: 'Cabo Verde' },
  { abbrev: 'KSA', name: 'Saudi Arabia',        namePt: 'Arábia Saudita' },
  { abbrev: 'URU', name: 'Uruguay',             namePt: 'Uruguai' },
  { abbrev: 'FRA', name: 'France',              namePt: 'França' },
  { abbrev: 'SEN', name: 'Senegal',             namePt: 'Senegal' },
  { abbrev: 'IRQ', name: 'Iraq',                namePt: 'Iraque' },
  { abbrev: 'NOR', name: 'Norway',              namePt: 'Noruega' },
  { abbrev: 'ARG', name: 'Argentina',           namePt: 'Argentina' },
  { abbrev: 'ALG', name: 'Algeria',             namePt: 'Argélia' },
  { abbrev: 'AUT', name: 'Austria',             namePt: 'Áustria' },
  { abbrev: 'JOR', name: 'Jordan',              namePt: 'Jordânia' },
  { abbrev: 'POR', name: 'Portugal',            namePt: 'Portugal' },
  { abbrev: 'COD', name: 'Congo DR',            namePt: 'Congo RD' },
  { abbrev: 'UZB', name: 'Uzbekistan',          namePt: 'Uzbequistão' },
  { abbrev: 'COL', name: 'Colombia',            namePt: 'Colômbia' },
  { abbrev: 'ENG', name: 'England',             namePt: 'Inglaterra' },
  { abbrev: 'CRO', name: 'Croatia',             namePt: 'Croácia' },
  { abbrev: 'GHA', name: 'Ghana',               namePt: 'Gana' },
  { abbrev: 'PAN', name: 'Panama',              namePt: 'Panamá' },
];

// ─── FWC sticker labels (positions 1-19) ─────────────────────────────────────
const FWC_LABELS: string[] = [
  'Official Emblem',
  'Official Emblem',
  'Official Mascots',
  'Official Slogan',
  'Official Ball',
  'Canada - Host Cities',
  'México - Host Cities',
  'USA - Host Cities',
  'Italy 1934',
  'Uruguay 1950',
  'W. Germany 1954',
  'Brazil 1962',
  'W. Germany 1974',
  'Argentina 1986',
  'Brazil 1994',
  'Brazil 2002',
  'Italy 2006',
  'Germany 2014',
  'Argentina 2022',
];

// ─── Player data per team ─────────────────────────────────────────────────────
// 20 labels per team: index 0=Brasão, 1-11=Players 1-11, 12=Team Photo, 13-19=Players 12-18
const TEAM_PLAYERS: Record<string, string[]> = {
  MEX: ['Brasão', 'Luis Malagón', 'Johan Vasquez', 'Jorge Sánchez', 'Cesar Montes', 'Jesus Gallardo', 'Israel Reyes', 'Diego Lainez', 'Carlos Rodriguez', 'Edson Alvarez', 'Orbelin Pineda', 'Marcel Ruiz', 'Time (panorâmica)', 'Érick Sánchez', 'Hirving Lozano', 'Santiago Giménez', 'Raúl Jiménez', 'Alexis Vega', 'Roberto Alvarado', 'Cesar Huerta'],
  RSA: ['Brasão', 'Ronwen Williams', 'Sipho Chaine', 'Aubrey Modiba', 'Samukele Kabini', 'Mbekezeli Mbokazi', 'Khulumani Ndamane', 'Siyabonga Ngezana', 'Khuliso Mudau', 'Nkosinathi Sibisi', 'Teboho Mokoena', 'Thalente Mbatha', 'Time (panorâmica)', 'Bathasi Aubaas', 'Yaya Sithole', 'Sipho Mbule', 'Lyle Foster', 'Iqraam Rayners', 'Mohau Nkota', 'Oswin Appollis'],
  KOR: ['Brasão', 'Hyeon-woo Jo', 'Seung-Gyu Kim', 'Min-jae Kim', 'Yu-min Cho', 'Young-woo Seol', 'Han-beom Lee', 'Tae-seok Lee', 'Myung-jae Lee', 'Jae-sung Lee', 'In-beom Hwang', 'Kang-in Lee', 'Time (panorâmica)', 'Seung-ho Paik', 'Jens Castrop', 'Dongg-yeong Lee', 'Gue-sung Cho', 'Heung-min Son', 'Hee-chan Hwang', 'Hyeon-Gyu Oh'],
  CZE: ['Brasão', 'Matej Kovar', 'Jindrich Stanek', 'Ladislav Krejci', 'Vladimir Coufal', 'Jaroslav Zeleny', 'Tomas Holes', 'David Zima', 'Michal Sadilek', 'Lukas Provod', 'Lukas Cerv', 'Tomas Soucek', 'Time (panorâmica)', 'Pavel Sulc', 'Matej Vydra', 'Vasil Kusej', 'Tomas Chory', 'Vaclav Cerny', 'Adam Hlozek', 'Patrik Schick'],
  CAN: ['Brasão', 'Dayne St.Clair', 'Alphonso Davies', 'Alistair Johnston', 'Samuel Adekugbe', 'Riche Larvea', 'Derek Cornelius', 'Moïse Bombito', 'Kamal Miller', 'Stephen Eustáquio', 'Ismaël Koné', 'Jonathan Osorio', 'Time (panorâmica)', 'Jacob Shaffelburg', 'Mathieu Choinière', 'Niko Sigur', 'Tajon Buchanan', 'Liam Millar', 'Cyle Larin', 'Jonathan David'],
  BIH: ['Brasão', 'Nikola Vasilj', 'Amer Dedic', 'Sead Kolasinac', 'Tarik Muharemovic', 'Nihad Mujakic', 'Nikola Katic', 'Amir Hadziahmetovic', 'Benjamin Tahirovic', 'Armin Gigovic', 'Ivan Sunjic', 'Ivan Basic', 'Time (panorâmica)', 'Dzenis Burnic', 'Esmir Bajraktarevic', 'Amar Memic', 'Ermedin Demirovic', 'Edin Dzeko', 'Samed Bazdar', 'Haris Tabakovic'],
  QAT: ['Brasão', 'Meshaal Barsham', 'Sultan Albrake', 'Lucas Mendes', 'Homam Ahmed', 'Boualem Khoukhi', 'Pedro Miguel', 'Tarek Salman', 'Mohamed Al-Mannai', 'Karim Boudiaf', 'Assim Madibo', 'Ahmed Fatehi', 'Time (panorâmica)', 'Mohammed Waad', 'Abdulaziz Hatem', 'Hassan Al-Haydos', 'Edmilson Junior', 'Akram Hassan Afif', 'Ahmed Al Ganehi', 'Almoez Ali'],
  SUI: ['Brasão', 'Gregor Kobel', 'Yvon Mvogo', 'Manuel Akanji', 'Ricardo Rodriguez', 'Nico Elvedi', 'Aurèle Amenda', 'Silvan Widmer', 'Granit Xhaka', 'Denis Zakaria', 'Remo Freuler', 'Fabian Rieder', 'Time (panorâmica)', 'Ardon Jashari', 'Johan Manzambi', 'Michel Aebischer', 'Breel Embolo', 'Ruben Vargas', 'Dan Ndoye', 'Zeki Amdouni'],
  BRA: ['Brasão', 'Alisson', 'Bento', 'Marquinhos', 'Éder Militão', 'Gabriel Magalhães', 'Danilo', 'Wesley', 'Lucas Paquetá', 'Casemiro', 'Bruno Guimarães', 'Luiz Henrique', 'Time (panorâmica)', 'Vinicius Júnior', 'Rodrygo', 'João Pedro', 'Matheus Cunha', 'Gabriel Martinelli', 'Raphinha', 'Estévão'],
  MAR: ['Brasão', 'Yassine Bounou', 'Munir El Kajoui', 'Achraf Hakimi', 'Noussair Mazraoui', 'Nayef Aguerd', 'Roman Saiss', 'Jawad El Yamio', 'Adam Masina', 'Sofyan Amrabat', 'Azzedine Ounahi', 'Eliesse Ben Seghir', 'Time (panorâmica)', 'Bilal El Khannouss', 'Ismael Saibari', 'Youssef En-Nesyri', 'Abde Ezzalzouli', 'Soufiane Rahimi', 'Brahim Diaz', 'Ayoub El Kaabi'],
  HAI: ['Brasão', 'Johny Placide', 'Carlens Arcus', 'Martin Expérience', 'Jean-Kevin Duverne', 'Ricardo Adé', 'Duke Lacroix', 'Garven Metusala', 'Hannes Delcroix', 'Leverton Pierre', 'Danley Jean Jacques', 'Jean-Ricner Bellegarde', 'Time (panorâmica)', 'Christopher Attys', 'Derrick Etienne Jr', 'Josue Casimir', 'Ruben Providence', 'Duckens Nazon', 'Louicius Deedson', 'Frantzdy Pierrot'],
  SCO: ['Brasão', 'Angus Gunn', 'Jack Hendry', 'Kieran Tierney', 'Aaron Hickey', 'Andrew Robertson', 'Scott McKenna', 'John Souttar', 'Anthony Ralston', 'Grant Hanley', 'Scott McTominay', 'Billy Gilmour', 'Time (panorâmica)', 'Lewis Ferguson', 'Ryan Christie', 'Kenny McLean', 'John McGinn', 'Lyndon Dykes', 'Che Adams', 'Ben Gannon-Doak'],
  USA: ['Brasão', 'Matt Freese', 'Chris Richards', 'Tim Ream', 'Mark McKenzie', 'Alex Freeman', 'Antonee Robinson', 'Tyler Adams', 'Tanner Tessmann', 'Weston McKennie', 'Christian Roldan', 'Timothy Weah', 'Time (panorâmica)', 'Diego Luna', 'Malik Tillman', 'Christian Pulisic', 'Brenden Aaronson', 'Ricardo Pepi', 'Haji Wright', 'Folarin Balogun'],
  PAR: ['Brasão', 'Roberto Fernandez', 'Orlando Gill', 'Gustavo Gomez', 'Fabián Balbuena', 'Juan José Cáceres', 'Omar Alderete', 'Junior Alonso', 'Mathías Villasanti', 'Diego Gomez', 'Damián Bobadilla', 'Andres Cubas', 'Time (panorâmica)', 'Matias Galarza Fonda', 'Julio Enciso', 'Alejandro Romero Gamarra', 'Miguel Almirón', 'Ramon Sosa', 'Angel Romero', 'Antonio Sanabria'],
  AUS: ['Brasão', 'Mathew Ryan', 'Joe Gauci', 'Harry Souttar', 'Alessandro Circati', 'Jordan Bos', 'Aziz Behich', 'Cameron Burgess', 'Lewis Miller', 'Milos Degenek', 'Jackson Irvine', 'Riley McGree', 'Time (panorâmica)', "Aiden O'Neill", 'Connor Metcalfe', 'Patrick Yazbek', 'Craig Goodwin', 'Kusini Vengi', 'Nestory Irankunda', 'Mohamed Touré'],
  TUR: ['Brasão', 'Ugurcan Cakir', 'Mert Muldur', 'Zeki Celik', 'Abdulkerim Bardakci', 'Caglar Soyuncu', 'Merih Demiral', 'Ferdi Kadioglu', 'Kaan Ayhan', 'Ismail Yuksek', 'Hakan Calhanoglu', 'Orkun Kokcu', 'Time (panorâmica)', 'Arda Guler', 'Irfan Can Kahveci', 'Yunus Akgun', 'Can Uzun', 'Baris Alper Yilmaz', 'Kerem Akturkoglu', 'Kenan Yildiz'],
  GER: ['Brasão', 'Marc-André ter Stegen', 'Jonathan Tah', 'David Raum', 'Nico Schlotterbeck', 'Antonio Rüdiger', 'Waldemar Anton', 'Ridle Baku', 'Maximilian Mittelstadt', 'Joshua Kimmich', 'Florian Wirtz', 'Felix Nmecha', 'Time (panorâmica)', 'Leon Goretzka', 'Jamal Musiala', 'Serge Gnabry', 'Kai Havertz', 'Leroy Sane', 'Karim Adeyemi', 'Nick Woltemade'],
  CUW: ['Brasão', 'Eloy Room', 'Armando Obispo', 'Sherel Floranus', 'Jurien Gaari', 'Joshua Brenet', 'Roshon Van Eijma', 'Shurandy Sambo', 'Livano Comenencia', 'Godfried Roemeratoe', 'Juninho Bacuna', 'Leandro Bacuna', 'Time (panorâmica)', 'Tahith Chong', 'Kenji Gorre', 'Jearl Margaritha', 'Jurgen Locadia', 'Jeremy Antonisse', 'Gervane Kastaneer', 'Sontje Hansen'],
  CIV: ['Brasão', 'Yahia Fofana', 'Ghislain Konan', 'Wilfried Singo', 'Odilon Kossounou', 'Evan Ndicka', 'Willy Boly', 'Emmanuel Agbadou', 'Ousmane Diomande', 'Franck Kessie', 'Seko Fofana', 'Ibrahim Sangare', 'Time (panorâmica)', 'Jean-Philippe Gbamin', 'Amad Diallo', 'Sébastien Haller', 'Simon Adingra', 'Yan Diomande', 'Evann Guessand', 'Oumar Diakite'],
  ECU: ['Brasão', 'Hernán Galíndez', 'Gonzalo Valle', 'Piero Hincapié', 'Pervis Estupiñán', 'Willian Pacho', 'Ángelo Preciado', 'Joel Ordóñez', 'Moises Caicedo', 'Alan Franco', 'Kendry Paez', 'Pedro Vite', 'Time (panorâmica)', 'John Veboah', 'Leonardo Campana', 'Gonzalo Plata', 'Nilson Angulo', 'Alan Minda', 'Kevin Rodriguez', 'Enner Valencia'],
  NED: ['Brasão', 'Bart Verbruggen', 'Virgil van Dijk', 'Micky van de Ven', 'Jurrien Timber', 'Denzel Dumfries', 'Nathan Aké', 'Jeremie Frimpong', 'Jan Paul van Hecke', 'Tijjani Reijnders', 'Ryan Gravenberch', 'Teun Koopmeiners', 'Time (panorâmica)', 'Frenkie de Jong', 'Xavi Simons', 'Justin Kluivert', 'Memphis Depay', 'Donyell Malen', 'Wout Weghorst', 'Cody Gakpo'],
  JPN: ['Brasão', 'Zion Suzuki', 'Henry Heroki Mochizuki', 'Ayumu Seko', 'Junnosuke Suzuki', 'Shogo Taniguchi', 'Tsuyoshi Watanabe', 'Kaishu Sano', 'Yuki Soma', 'Ao Tanaka', 'Daichi Kamada', 'Takefusa Kubo', 'Time (panorâmica)', 'Ritsu Doan', 'Keito Nakamura', 'Takumi Minamino', 'Shuto Machino', 'Junya Ito', 'Koki Ogawa', 'Ayase Ueda'],
  SWE: ['Brasão', 'Victor Johansson', 'Isak Hien', 'Gabriel Gudmundsson', 'Emil Holm', 'Victor Nilsson Lindelöf', 'Gustaf Lagerbielke', 'Lucas Bergvall', 'Hugo Larsson', 'Jesper Karlström', 'Yasin Ayari', 'Mattias Svanberg', 'Time (panorâmica)', 'Daniel Svensson', 'Ken Sema', 'Roony Bardghji', 'Dejan Kulusevski', 'Anthony Elanga', 'Alexander Isak', 'Viktor Gyökeres'],
  TUN: ['Brasão', 'Bechir Ben Said', 'Aymen Dahmen', 'Yan Valery', 'Montassar Talbi', 'Yassine Meriah', 'Ali Abdi', 'Dylan Bronn', 'Ellyes Skhiri', 'Aissa Laidouni', 'Ferjani Sassi', 'Mohamed Ali Ben Romdhane', 'Time (panorâmica)', 'Hannibal Mejbri', 'Elias Achouri', 'Elias Saad', 'Hazem Mastouri', 'Ismael Gharbi', 'Sayfallah Ltaief', 'Naim Sliti'],
  BEL: ['Brasão', 'Thibaut Courtois', 'Arthur Theate', 'Timothy Castagne', 'Zeno Debast', 'Brandon Mechele', 'Maxim De Cuyper', 'Thomas Meunier', 'Youri Tielemans', 'Amadou Onana', 'Nicolas Raskin', 'Alexis Saelemaekers', 'Time (panorâmica)', 'Hans Vanaken', 'Kevin De Bruyne', 'Jérémy Doku', 'Charles De Ketelaere', 'Leandro Trossard', 'Loïs Openda', 'Romelu Lukaku'],
  EGY: ['Brasão', 'Mohamed El Shenawy', 'Mohamed Hany', 'Mohamed Hamdy', 'Yasser Ibrahim', 'Khaled Sobhi', 'Ramy Rabia', 'Hossam Abdelmaguid', 'Ahmed Fatouh', 'Marwan Attia', 'Zizo', 'Hamdy Fathy', 'Time (panorâmica)', 'Mohamed Lasheen', 'Emam Ashour', 'Osama Faisal', 'Mohamed Salah', 'Mostafa Mohamed', 'Trezeguet', 'Omar Marmoush'],
  IRN: ['Brasão', 'Alireza Beiranvand', 'Morteza Pouraliganji', 'Ehsan Hajsafi', 'Milad Mohammadi', 'Shojae Khalilzadeh', 'Ramin Rezaeian', 'Hossein Kanaani', 'Sadegh Moharrami', 'Saleh Hardani', 'Saeed Ezatolahi', 'Saman Ghoddos', 'Time (panorâmica)', 'Omid Noorafkan', 'Roozbeh Cheshmi', 'Mohammad Mohebi', 'Sardar Azmoun', 'Mehdi Taremi', 'Alireza Jahanbakhsh', 'Ali Gholizadeh'],
  NZL: ['Brasão', 'Max Crocombe Payne', 'Alex Paulsen', 'Michael Boxall', 'Liberato Cacace', 'Tim Payne', 'Tyler Bindon', 'Francis de Vries', 'Finn Surman', 'Joe Bell', 'Sarpreet Singh', 'Ryan Thomas', 'Time (panorâmica)', 'Matthew Garbett', 'Marko Stamenić', 'Ben Old', 'Chris Wood', 'Elijah Just', 'Callum McCowatt', 'Kosta Barbarouses'],
  ESP: ['Brasão', 'Unai Simon', 'Robin Le Normand', 'Aymeric Laporte', 'Dean Huijsen', 'Pedro Porro', 'Dani Carvajal', 'Marc Cucurella', 'Martín Zubimendi', 'Rodri', 'Pedri', 'Fabian Ruiz', 'Time (panorâmica)', 'Mikel Merino', 'Lamine Yamal', 'Dani Olmo', 'Nico Williams', 'Ferran Torres', 'Álvaro Morata', 'Mikel Oyarzabal'],
  CPV: ['Brasão', 'Vozinha', 'Logan Costa', 'Pico', 'Diney', 'Steven Moreira', 'Wagner Pina', 'Joao Paulo', 'Yannick Semedo', 'Kevin Pina', 'Patrick Andrade', 'Jamiro Monteiro', 'Time (panorâmica)', 'Deroy Duarte', 'Garry Rodrigues', 'Jovane Cabral', 'Ryan Mendes', 'Dailon Livramento', 'Willy Semedo', 'Bebe'],
  KSA: ['Brasão', 'Nawaf Alaqidi', 'Abdulrahman Al-Sanbi', 'Saud Abdulhamid', 'Nawaf Bouwashl', 'Jihad Thakri', 'Moteb Al-Harbi', 'Hassan Altambakti', 'Musab Aljuwayr', 'Ziyad Aljohani', 'Abdullah Alkhaibari', 'Nasser Aldawsari', 'Time (panorâmica)', 'Saleh Abu Alshamat', 'Marwan Alsahafi', 'Salem Aldawsari', 'Abdulrahman Al-Aboud', 'Feras Akbrikan', 'Saleh Alshehri', 'Abdullah Al-Hamdan'],
  URU: ['Brasão', 'Sergio Rochet', 'Santiago Mele', 'Ronald Araujo', 'José María Giménez', 'Sebastian Caceres', 'Mathias Olivera', 'Guillermo Varela', 'Nahitan Nandez', 'Federico Valverde', 'Giorgian De Arrascaeta', 'Rodrigo Bentancur', 'Time (panorâmica)', 'Manuel Ugarte', 'Nicolás de la Cruz', 'Maxi Araujo', 'Darwin Núñez', 'Federico Viñas', 'Rodrigo Aguirre', 'Facundo Pellistri'],
  FRA: ['Brasão', 'Mike Maignan', 'Theo Hernandez', 'William Saliba', 'Jules Kounde', 'Ibrahima Konate', 'Dayot Upamecano', 'Lucas Digne', 'Aurélien Tchouaméni', 'Eduardo Camavinga', 'Manu Kone', 'Adrien Rabiot', 'Time (panorâmica)', 'Michael Olise', 'Ousmane Dembele', 'Bradley Barcola', 'Désiré Doué', 'Kingsley Coman', 'Hugo Ekitike', 'Kylian Mbappe'],
  SEN: ['Brasão', 'Edouard Mendy', 'Yehvann Diouf', 'Moussa Niakhaté', 'Abdoulaye Seck', 'Ismail Jakobs', 'El Hadji Malick Diouf', 'Kalidou Koulibaly', 'Idrissa Gana Gueye', 'Pape Matar Sarr', 'Pape Gueye', 'Habib Diarra', 'Time (panorâmica)', 'Lamine Camara', 'Sadio Mane', 'Ismaïla Sarr', 'Boulaye Dia', 'Iliman Ndiaye', 'Nicolas Jackson', 'Krepin Diatta'],
  IRQ: ['Brasão', 'Jalal Hassan', 'Rebin Sulaka', 'Hussein Ali', 'Akam Hashem', 'Merchas Doski', 'Zaid Tahseen', 'Manaf Younis', 'Zidane Iqbal', 'Amir Al-Ammari', 'Ibrahim Bavesh', 'Ali Jasim', 'Time (panorâmica)', 'Youssef Amyn', 'Aimar Sher', 'Marko Farji', 'Osama Rashid', 'Ali Al-Hamadi', 'Aymen Hussein', 'Mohanad Ali'],
  NOR: ['Brasão', 'Orjan Nyland', 'Julian Ryerson', 'Leo Ostigård', 'Kristoffer Vassbakk Ajer', 'Marcus Holmgren Pedersen', 'David Møller Wolfe', 'Torbjørn Heggem', 'Morten Thorsby', 'Martin Ødegaard', 'Sander Berge', 'Andreas Schjelderup', 'Time (panorâmica)', 'Patrick Berg', 'Erling Haaland', 'Alexander Sørloth', 'Aron Dønnum', 'Jorgen Strand Larsen', 'Antonio Nusa', 'Oscar Bobb'],
  ARG: ['Brasão', 'Emiliano Martinez', 'Nahuel Molina', 'Cristian Romero', 'Nicolas Otamendi', 'Nicolas Tagliafico', 'Leonardo Balerdi', 'Enzo Fernandez', 'Alexis Mac Allister', 'Rodrigo De Paul', 'Exequiel Palacios', 'Leandro Paredes', 'Time (panorâmica)', 'Nico Paz', 'Franco Mastantuono', 'Nico Gonzalez', 'Lionel Messi', 'Lautaro Martinez', 'Julian Alvarez', 'Giuliano Simeone'],
  ALG: ['Brasão', 'Alexis Guendouz', 'Ramy Bensebaini', 'Youcef Atal', 'Rayan Aït-Nouri', 'Mohamed Amine Tougai', 'Aïssa Mandi', 'Ismael Bennacer', 'Houssem Aquar', 'Hicham Boudaoui', 'Ramiz Zerrouki', 'Nabil Bentalab', 'Time (panorâmica)', 'Farés Chaibi', 'Riyad Mahrez', 'Said Benrahma', 'Anis Hadj Moussa', 'Amine Gouiri', 'Baghdad Bounedjah', 'Mohammed Amoura'],
  AUT: ['Brasão', 'Alexander Schlager', 'Patrick Pentz', 'David Alaba', 'Kevin Danso', 'Philipp Lienhart', 'Stefan Posch', 'Phillipp Mwene', 'Alexander Prass', 'Xaver Schlager', 'Marcel Sabitzer', 'Konrad Laimer', 'Time (panorâmica)', 'Florian Grillitsch', 'Nicolas Seiwald', 'Romano Schmid', 'Patrick Wimmer', 'Christoph Baumgartner', 'Michael Gregoritsch', 'Marko Arnautović'],
  JOR: ['Brasão', 'Yazeed Abulaila', 'Ihsan Haddad', 'Mohammad Abu Hashish', 'Yazan Al-Arab', 'Abdallah Nasib', 'Saleem Obaid', 'Mohammad Abualnadi', 'Ibrahim Saadeh', 'Nizar Al-Rashdan', 'Noor Al-Rawabdeh', 'Mohannad Abu Taha', 'Time (panorâmica)', 'Amer Jamous', 'Musa Al-Taamari', 'Yazan Al-Naimat', 'Mahmoud Al-Mardi', 'Ali Olwan', 'Mohammad Abu Zrayq', 'Ibrahim Sabra'],
  POR: ['Brasão', 'Diogo Costa', 'Jose Sa', 'Ruben Dias', 'João Cancelo', 'Diogo Dalot', 'Nuno Mendes', 'Gonçalo Inácio', 'Bernardo Silva', 'Bruno Fernandes', 'Ruben Neves', 'Vitinha', 'Time (panorâmica)', 'João Neves', 'Cristiano Ronaldo', 'Francisco Trincao', 'João Felix', 'Gonçalo Ramos', 'Pedro Neto', 'Rafael Leão'],
  COD: ['Brasão', 'Lionel Mpasi', 'Aaron Wan-Bissaka', 'Axel Tuanzebe', 'Arthur Masuaku', 'Chancel Mbemba', 'Joris Kayembe', 'Charles Pickel', "Ngal'ayel Mukau", 'Edo Kayembe', 'Samuel Moutoussamy', 'Noah Sadiki', 'Time (panorâmica)', 'Théo Bongonda', 'Meschak Elia', 'Yoane Wissa', 'Brian Cipenga', 'Fiston Mayele', 'Cédric Bakambu', 'Nathanaël Mbuku'],
  UZB: ['Brasão', 'Utkir Yusupov', 'Farrukh Savfiev', 'Sherzod Nasrullaev', 'Umar Eshmurodov', 'Husniddin Aliqulov', 'Rustamjon Ashurmatov', 'Khojiakbar Alijonov', 'Abdukodir Khusanov', 'Odiljon Hamrobekov', 'Otabek Shukurov', 'Jamshid Iskanderov', 'Time (panorâmica)', 'Azizbek Turgunboev', 'Khojimat Erkinov', 'Eldor Shomurodov', 'Oston Urunov', 'Jaloliddin Masharipov', 'Igor Sergeev', 'Abbosbek Fayzullaev'],
  COL: ['Brasão', 'Camilo Vargas', 'David Ospina', 'Dávinson Sánchez', 'Yerry Mina', 'Daniel Munoz', 'Johan Mojica', 'Jhon Lucumí', 'Santiago Arias', 'Jefferson Lerma', 'Kevin Castaño', 'Richard Rios', 'Time (panorâmica)', 'James Rodriguez', 'Juan Fernando Quintero', 'Jorge Carrascal', 'Jon Arias', 'Jhon Cordova', 'Luis Suarez', 'Luis Diaz'],
  ENG: ['Brasão', 'Jordan Pickford', 'John Stones', 'Marc Guéhi', 'Ezri Konsa', 'Trent Alexander-Arnold', 'Reece James', 'Dan Burn', 'Jordan Henderson', 'Declan Rice', 'Jude Bellingham', 'Cole Palmer', 'Time (panorâmica)', 'Morgan Rogers', 'Anthony Gordon', 'Phil Foden', 'Bukayo Saka', 'Harry Kane', 'Marcus Rashford', 'Ollie Watkins'],
  CRO: ['Brasão', 'Dominik Livaković', 'Duje Caleta-Car', 'Josko Gvardiol', 'Josip Stanišić', 'Luka Vušković', 'Josip Sutalo', 'Kristijan Jakic', 'Luka Modrić', 'Mateo Kovacic', 'Martin Baturina', 'Lovro Majer', 'Time (panorâmica)', 'Mario Pasalic', 'Petar Sucic', 'Ivan Perišić', 'Marco Pasalic', 'Ante Budimir', 'Andrej Kramarić', 'Franjo Ivanovic'],
  GHA: ['Brasão', 'Lawrence Ati Zigi', 'Tariq Lamptey', 'Mohammed Salisu', 'Alidu Seidu', 'Alexander Djiku', 'Gideon Mensah', 'Caleb Yirenkyi', 'Abdul Issahaku Fatawu', 'Thomas Partey', 'Salis Abdul Samed', 'Kamaldeen Sulemana', 'Time (panorâmica)', 'Mohammed Kudus', 'Inaki Williams', 'Jordan Ayew', 'Andrew Ayew', 'Joseph Paintsil', 'Osman Bukari', 'Antoine Semenyo'],
  PAN: ['Brasão', 'Orlando Mosquera', 'Luis Mejia', 'Fidel Escobar', 'Andres Andrade', 'Michael Amir Murillo', 'Eric Davis', 'Jose Cordoba', 'Cesar Blackman', 'Cristian Martinez', 'Aníbal Godoy', 'Adalberto Carrasquilla', 'Time (panorâmica)', 'Édgar Bárcenas', 'Carlos Harvey', 'Ismael Díaz', 'Jose Fajardo', 'Cecilio Waterman', 'Jose Luiz Rodriguez', 'Alberto Quintero'],
};

// ─── Build album ──────────────────────────────────────────────────────────────
let _id = 0;
const ALL_SECTIONS: Section[] = [];

// 1. Figurinha especial 00
ALL_SECTIONS.push({
  id: 'especial00',
  title: 'Especial',
  stickers: [
    { number: _id++, code: '00', section: 'especial00', label: 'Figurinha Especial', isSpecial: true },
  ],
});

// 2. FWC 1-19
ALL_SECTIONS.push({
  id: 'FWC',
  title: 'FWC',
  stickers: Array.from({ length: 19 }, (_, i) => ({
    number: _id++,
    code: `FWC ${i + 1}`,
    section: 'FWC',
    label: FWC_LABELS[i],
    isSpecial: false,
  })),
});

// 3. 48 teams × 20 stickers
for (const team of TEAMS) {
  const players = TEAM_PLAYERS[team.abbrev];
  ALL_SECTIONS.push({
    id: team.abbrev,
    title: team.name,
    stickers: Array.from({ length: 20 }, (_, i) => ({
      number: _id++,
      code: `${team.abbrev} ${i + 1}`,
      section: team.abbrev,
      label: players[i],
      team: team.name,
      teamPt: team.namePt,
      isSpecial: false,
    })),
  });
}

// 4. Coca-Cola specials CC1-CC14
ALL_SECTIONS.push({
  id: 'CC',
  title: 'Coca-Cola',
  stickers: Array.from({ length: 14 }, (_, i) => ({
    number: _id++,
    code: `CC${i + 1}`,
    section: 'CC',
    label: `Coca-Cola ${i + 1}`,
    isSpecial: true,
  })),
});

// ─── Exports ──────────────────────────────────────────────────────────────────
export const ALBUM_SECTIONS: Section[] = ALL_SECTIONS;

/** Total stickers: 1 (00) + 19 (FWC) + 960 (48×20 teams) + 14 (CC) = 994 */
export const TOTAL_STICKERS: number = _id;

/** Lookup by internal sequential ID (stored in the database) */
export const STICKER_MAP: Map<number, Sticker> = new Map(
  ALL_SECTIONS.flatMap((s) => s.stickers.map((st) => [st.number, st])),
);

/** Lookup by sticker code, e.g. "MEX 5", "FWC 3", "CC2", "00" */
export const STICKER_CODE_MAP: Map<string, Sticker> = new Map(
  ALL_SECTIONS.flatMap((s) => s.stickers.map((st) => [st.code, st])),
);



