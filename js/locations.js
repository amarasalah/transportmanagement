/**
 * TUNISIA LOCATIONS MODULE
 * Complete list of 24 Governorates and their Delegations with GPS coordinates
 * Coordinates are for governorate capitals (will be used for distance estimation)
 */

// GPS Coordinates for each governorate capital
const GouvernoratCoordinates = {
    "Ariana": { lat: 36.86250, lng: 10.19556 },
    "Béja": { lat: 36.73333, lng: 9.18333 },
    "Ben Arous": { lat: 36.75333, lng: 10.22220 },
    "Bizerte": { lat: 37.29000, lng: 9.87000 },
    "Gabès": { lat: 33.88333, lng: 10.11667 },
    "Gafsa": { lat: 34.42500, lng: 8.78417 },
    "Jendouba": { lat: 36.50111, lng: 8.77944 },
    "Kairouan": { lat: 35.68000, lng: 10.10000 },
    "Kasserine": { lat: 35.18000, lng: 8.83000 },
    "Kébili": { lat: 33.70194, lng: 8.97361 },
    "Kef": { lat: 36.19000, lng: 8.71000 },
    "Mahdia": { lat: 35.52000, lng: 11.07000 },
    "Manouba": { lat: 36.80778, lng: 10.10111 },
    "Médenine": { lat: 33.35000, lng: 10.49000 },
    "Monastir": { lat: 35.79000, lng: 10.82000 },
    "Nabeul": { lat: 36.45000, lng: 10.73333 },
    "Sfax": { lat: 34.74056, lng: 10.76028 },
    "Sidi Bouzid": { lat: 35.04028, lng: 9.49361 },
    "Siliana": { lat: 36.08333, lng: 9.36667 },
    "Sousse": { lat: 35.82556, lng: 10.64111 },
    "Tataouine": { lat: 32.93333, lng: 10.45000 },
    "Tozeur": { lat: 33.93000, lng: 8.13000 },
    "Tunis": { lat: 36.80278, lng: 10.17972 },
    "Zaghouan": { lat: 36.40000, lng: 10.14000 }
};

// Tunisia Locations with delegations
const TunisiaLocations = {
    "Ariana": [
        "Ariana Ville", "Ettadhamen", "Kalâat el-Andalous", "La Soukra", "M'nihla", "Raoued", "Sidi Thabet"
    ],
    "Béja": [
        "Amdoun", "Béja Nord", "Béja Sud", "Goubellat", "Medjez el-Bab", "Nefza", "Teboursouk", "Testour", "Thibar"
    ],
    "Ben Arous": [
        "Ben Arous", "Boumhel", "El Mourouj", "Ezzahra", "Fouchana", "Hammam Chott", "Hammam-Lif", "M'Hamdia", "Medina Jedida", "Mégrine", "Mornag", "Radès"
    ],
    "Bizerte": [
        "Bizerte Nord", "Bizerte Sud", "Djoumine", "El Alia", "Ghar el-Melh", "Ghezala", "Mateur", "Menzel Bourguiba", "Menzel Jemil", "Ras Jebel", "Sejenane", "Tinja", "Utique", "Zarzouna"
    ],
    "Gabès": [
        "El Hamma", "Gabès Médina", "Gabès Ouest", "Gabès Sud", "Ghannouch", "Mareth", "Matmata", "Métouia", "Menzel El Habib", "Nouvelle Matmata", "Oudhref"
    ],
    "Gafsa": [
        "Belkhir", "El Guettar", "El Ksar", "Gafsa Nord", "Gafsa Sud", "Mdhilla", "Métlaoui", "Moularès", "Redeyef", "Sened", "Sidi Aïch"
    ],
    "Jendouba": [
        "Aïn Draham", "Balta-Bou Aouane", "Bou Salem", "Fernana", "Ghardimaou", "Jendouba Nord", "Jendouba Sud", "Oued Meliz", "Tabarka"
    ],
    "Kairouan": [
        "Aïn Djeloula", "Bou Hajla", "Chebika", "Echrarda", "El Alâa", "Haffouz", "Hajeb el-Ayoun", "Kairouan Nord", "Kairouan Sud", "Menzel Mehiri", "Nasrallah", "Oueslatia", "Sbikha"
    ],
    "Kasserine": [
        "El Ayoun", "Fériana", "Foussana", "Haïdra", "Hassi El Ferid", "Jedelienne", "Kasserine Nord", "Kasserine Sud", "Majel Bel Abbès", "Sbeïtla", "Sbiba", "Thala", "Ezzouhour"
    ],
    "Kébili": [
        "Douz Nord", "Douz Sud", "Faouar", "Kébili Nord", "Kébili Sud", "Rjim Maatoug", "Souk Lahad"
    ],
    "Kef": [
        "Dahmani", "El Ksour", "Jérissa", "Kalâat Khasba", "Kalaat Senan", "Kef Est", "Kef Ouest", "Nebeur", "Sakiet Sidi Youssef", "Sers", "Tajerouine"
    ],
    "Mahdia": [
        "Bou Merdes", "Chebba", "Chorbane", "El Jem", "Essouassi", "Hebira", "Ksour Essef", "Mahdia", "Melloulèche", "Ouled Chamekh", "Rejiche", "Sidi Alouane"
    ],
    "Manouba": [
        "Borj El Amri", "Douar Hicher", "El Batan", "Jedeida", "La Manouba", "Mornaguia", "Oued Ellil", "Tebourba"
    ],
    "Médenine": [
        "Ben Gardane", "Beni Khedache", "Djerba Ajim", "Djerba Houmt Souk", "Djerba Midoun", "Médenine Nord", "Médenine Sud", "Sidi Makhlouf", "Zarzis"
    ],
    "Monastir": [
        "Bekalta", "Bembla", "Beni Hassen", "Jemmal", "Ksar Hellal", "Monastir", "Moknine", "Ouerdanine", "Sahline", "Sayada-Lamta-Bou Hajar", "Teboulba", "Zéramdine"
    ],
    "Nabeul": [
        "Béni Khalled", "Béni Khiar", "Bou Argoub", "Dar Chaâbane", "El Haouaria", "Grombalia", "Hammamet", "Kélibia", "Korba", "Menzel Bouzelfa", "Menzel Temime", "Nabeul", "Soliman", "Takelsa"
    ],
    "Sfax": [
        "Agareb", "Bir Ali Ben Khélifa", "El Amra", "El Hencha", "Ghraïba", "Jebiniana", "Kerkennah", "Mahrès", "Menzel Chaker", "Sakiet Eddaïer", "Sakiet Ezzit", "Sfax Médina", "Sfax Ouest", "Sfax Sud", "Skhira", "Thyna"
    ],
    "Sidi Bouzid": [
        "Bir el-Haffey", "Cebbala Ouled Asker", "Jilma", "Meknassy", "Menzel Bouzaïene", "Ouled Haffouz", "Regueb", "Sidi Ali Ben Aoun", "Sidi Bouzid Est", "Sidi Bouzid Ouest", "Souk Jedid"
    ],
    "Siliana": [
        "Bargou", "Bou Arada", "El Aroussa", "El Krib", "Gaâfour", "Kassra", "Makthar", "Rouhia", "Siliana Nord", "Siliana Sud"
    ],
    "Sousse": [
        "Akouda", "Bouficha", "Enfidha", "Hammam Sousse", "Hergla", "Kalaa Kebira", "Kalaa Seghira", "Kondar", "M'saken", "Sidi Bou Ali", "Sidi El Hani", "Sousse Jawhara", "Sousse Médina", "Sousse Riadh"
    ],
    "Tataouine": [
        "Bir Lahmar", "Dhehiba", "Ghomrassen", "Remada", "Smâr", "Tataouine Nord", "Tataouine Sud"
    ],
    "Tozeur": [
        "Degueche", "Hazoua", "Nefta", "Tameghza", "Tozeur"
    ],
    "Tunis": [
        "Bab Bhar", "Bab Souika", "Carthage", "Cité El Khadra", "Djebel Jelloud", "El Kabaria", "El Kram", "El Menzah", "El Omrane", "El Omrane Supérieur", "El Ouardia", "Ezzouhour", "Hraïria", "La Goulette", "La Marsa", "Le Bardo", "Médina", "Séjoumi", "Sidi El Béchir", "Sidi Hassine"
    ],
    "Zaghouan": [
        "Bir Mcherga", "El Fahs", "Nadhour", "Saouaf", "Zaghouan", "Zriba"
    ]
};

// Get all governorates
function getGouvernorats() {
    return Object.keys(TunisiaLocations).sort();
}

// Get delegations for a specific governorate
function getDelegations(gouvernorat) {
    return TunisiaLocations[gouvernorat] || [];
}

// Get coordinates for a governorate
function getGouvernoratCoordinates(gouvernorat) {
    return GouvernoratCoordinates[gouvernorat] || null;
}

/**
 * Calculate distance between two points using Haversine formula
 * Returns distance in kilometers
 */
function calculateDistance(lat1, lng1, lat2, lng2) {
    const R = 6371; // Earth's radius in km
    const dLat = toRad(lat2 - lat1);
    const dLng = toRad(lng2 - lng1);
    const a =
        Math.sin(dLat / 2) * Math.sin(dLat / 2) +
        Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) *
        Math.sin(dLng / 2) * Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
}

function toRad(deg) {
    return deg * (Math.PI / 180);
}

/**
 * Calculate road distance between two governorates
 * Uses straight-line distance with a road factor (typically 1.3-1.4 for Tunisia)
 * Returns distance in km, rounded to nearest integer
 */
function calculateRoadDistance(fromGouvernorat, toGouvernorat) {
    const from = GouvernoratCoordinates[fromGouvernorat];
    const to = GouvernoratCoordinates[toGouvernorat];

    if (!from || !to) {
        console.warn('Coordinates not found for:', fromGouvernorat, 'or', toGouvernorat);
        return 0;
    }

    // If same location
    if (fromGouvernorat === toGouvernorat) {
        return 20; // Default intra-city distance
    }

    // Calculate straight-line distance
    const straightLine = calculateDistance(from.lat, from.lng, to.lat, to.lng);

    // Apply road factor (roads are typically 30-40% longer than straight line)
    const roadFactor = 1.35;
    const roadDistance = Math.round(straightLine * roadFactor);

    return roadDistance;
}

/**
 * Get distance estimate between two locations (gouvernorat + delegation)
 * This uses gouvernorat coordinates for estimation
 */
function getDistanceEstimate(fromGouvernorat, fromDelegation, toGouvernorat, toDelegation) {
    let distance = calculateRoadDistance(fromGouvernorat, toGouvernorat);

    // Add small adjustment for different delegations within same governorate
    if (fromGouvernorat === toGouvernorat && fromDelegation !== toDelegation) {
        distance = Math.max(15, distance); // Minimum 15 km between different delegations
    }

    return distance;
}

// Export for use in other modules
if (typeof window !== 'undefined') {
    window.TunisiaLocations = TunisiaLocations;
    window.GouvernoratCoordinates = GouvernoratCoordinates;
    window.getGouvernorats = getGouvernorats;
    window.getDelegations = getDelegations;
    window.getGouvernoratCoordinates = getGouvernoratCoordinates;
    window.calculateRoadDistance = calculateRoadDistance;
    window.getDistanceEstimate = getDistanceEstimate;
}
