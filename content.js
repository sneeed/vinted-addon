// ==UserScript==
// @name         Nur Artikel aus Deutschland in Vinted anzeigen
// @namespace    http://tampermonkey.net/
// @version      1.0
// @description  Blendet Artikel, die vermutlich in Frankreich eingestellt wurden, aus. Dabei wird die Wahrscheinlichkeit durch französische Begriffe im Artikeltitel berechnet.
// @author       sneeed
// @match        *://*.vinted.de/*
// @grant        none
// ==/UserScript==

// TODO
// popup um italienisch, deutsch, französisch erweitern

// zum Testen nach "Kiabi" (französische Marke) gesucht

(function () {
    'use strict';

    const processedItems = new Set();
    const referenceScore = 1; // hier einstellen, wie streng gefiltert wird

    // Französische Sonderzeichen (Score: 2)
    const frenchSpecialChars = new Set(["é", "è", "ê", "ë", "à", "â", "î", "ï", "ô", "û", "ù", "ç"]);

    // Französische Keywords (Score: 1 pro Treffer)
    const frenchKeywords = new Set([// Kleidung
        "pantalon", "pantalons", "leggings", "blouse", "blouses", "tunique", "tuniques", "gilet", "gilets", "sweat", "sweats", "cardigan", "cardigans", "robe", "robes", "combinaison", "combinaisons", "jupe", "jupes", "blouson", "blousons", "anoraks", "sandales", "ballerines", "mocassins", "écharpe", "écharpes", "foulard", "foulards", "sac", "sacs", "chapeau", "chapeaux", "ceinture", "ceintures", "manteau", "manteaus", "bottes", "debardeur", "chemise", "chemises", "manche", "manches", "chemisier",

        // Materialien & Muster
        "coton", "laine", "soie", "lin", "cuir", "rayures", "pois", "carreaux", "fleurs", "velours", "jean",

        // Farben
        "bleu", "bleue", "vert", "verte", "gris", "grise", "noir", "noire", "blanc", "blanche", "violet", "violette", "beige", "bordeaux", "turquoise", "kaki", "terracota", "rouge", "jaune", "marron", "rose", "émeraude", "argent", "argente", "doré", "dorée", "cuivre", "cuivrée", "crème", "fuchsia", "lilas", "saumon", "saumonée", "cendre", "cendrée", "abricot", "abricotée", "lavande", "améthyste", "carmin", "carminée", "ivoire", "prune", "pêche", "aubergine", "multicolore",

        // Zustand & Stil
        "neuf", "neufs", "usagé", "usagée", "bon état", "vintage", "chic", "décontracté", "élégant", "élégante",

        // Größen
        "taille", "taille unique", "petit", "petite", "grand", "grande", "moyen", "moyenne", "ans", "longues", "longue",

        // Zielgruppe
        "femme", "homme", "enfant", "enfants", "bébé", "bébés", "fille", "filles", "garçon", "garçons",

        // Weitere
        "chaud", "pluie", "lot", "et", "ou", "sans"]);

    // Whitelist mit Begriffen, die bei der Scoring-Berechnung ignoriert werden
    const whitelist = new Set([
        // Marken
        "Petit Bateau", "Lacoste", "Chanel", "Dior", "Louis Vuitton", "Yves Saint Laurent", "Balmain", "Givenchy", "Jean Paul Gaultier", "Hermès", "Celine", "Lanvin", "Kenzo", "A.P.C.", "Isabel Marant", "Sandro", "Maje", "Ba&sh", "The Kooples", "Sézane", "Zadig & Voltaire", "Chloé", "Courrèges", "Jacquemus", "Patou", "Carven", "Officine Générale", "Pierre Cardin", "Paco Rabanne", "Loewe", "Kookaï", "Morgane", "Eden Park", "Agnes B", "Saint James", "Sessùn", "Le Coq Sportif", "Armor Lux", "IKKS", "Cop Copine", "Promod", "Gerard Darel", "Marithé + François Girbaud", "Naf Naf", "Cyrillus", "Vertbaudet", "Orcival", "American Vintage", "Maison Kitsuné", "Rouje", "Rose", "Repetto", "Valentino",]);


    /**
     * Berechnet den Score basierend auf französischen Keywords und Sonderzeichen.
     * Whitelist-Wörter reduzieren den Score, auch wenn sie mehrfach vorkommen.
     * @param {string} title - Titel des Artikels
     * @returns {number} - Berechneter Score
     */
    function calculateScore(title) {
        let baseScore = 0; // Score vor der Whitelist-Korrektur
        let whitelistReduction = 0; // Abzuziehender Score-Anteil durch Whitelist-Wörter

        let matchedWords = []; // Enthält gefundene französische Keywords
        let matchedChars = []; // Enthält gefundene französische Sonderzeichen
        let matchedWhitelist = []; // Enthält erkannte Whitelist-Wörter

        const lowerTitle = title.toLowerCase();
        const words = lowerTitle.replace(/[^\wÀ-ÿ-]+/g, ' ').split(/\s+/);

        // Berechnung des Scores durch französische Keywords
        words.forEach(word => {
            if (frenchKeywords.has(word)) {
                baseScore += 1;
                matchedWords.push(word);
            }
        });

        // Berechnung des Scores durch französische Sonderzeichen
        for (const char of lowerTitle) {
            if (frenchSpecialChars.has(char)) {
                baseScore += 2;
                matchedChars.push(char);
            }
        }

        // Prüfen, ob ein Begriff aus der Whitelist mehrfach enthalten ist
        whitelist.forEach(whitelistTerm => {
            const lowerWhitelistTerm = whitelistTerm.toLowerCase();
            let matchCount = (lowerTitle.match(new RegExp(lowerWhitelistTerm, "g")) || []).length; // Zählt Vorkommen

            if (matchCount > 0) {
                let wlScore = 0;

                // Prüfen, ob der vollständige Markenname Wörter enthält, die auf der French-Keyword-Liste stehen
                const wlWords = lowerWhitelistTerm.split(/\s+/);
                wlWords.forEach(wlWord => {
                    if (frenchKeywords.has(wlWord)) {
                        wlScore += 1;
                    }
                });

                // Sonderzeichen aus dem Markennamen berechnen
                for (const char of lowerWhitelistTerm) {
                    if (frenchSpecialChars.has(char)) {
                        wlScore += 2;
                    }
                }

                // **Reduktion MULTIPLIZIEREN mit Anzahl der Vorkommen!**
                whitelistReduction += wlScore * matchCount;
                matchedWhitelist.push(`${whitelistTerm} (x${matchCount})`);
            }
        });

        // Bereinigter Score nach Whitelist-Korrektur (nie unter 0)
        const finalScore = Math.max(0, baseScore - whitelistReduction);

        // 🔹 Logging-Ausgabe für Debugging 🔹
        console.log(`🔎 Artikel-Titel: "${title}"`);
        console.log(`   ➤ Erkannte Wörter: ${matchedWords.length > 0 ? matchedWords.join(", ") : "Keine"}`);
        console.log(`   ➤ Erkannte Sonderzeichen: ${matchedChars.length > 0 ? matchedChars.join(", ") : "Keine"}`);
        console.log(`   ➤ Roh-Score (vor Whitelist): ${baseScore}`);
        console.log(`   ➤ Whitelist-Wörter erkannt: ${matchedWhitelist.length > 0 ? matchedWhitelist.join(", ") : "Keine"}`);
        console.log(`   ➤ Whitelist-Reduktion (inkl. Mehrfach-Vorkommen): -${whitelistReduction}`);
        console.log(`   ➤ Finaler Score nach Korrektur: ${finalScore}`);

        return finalScore;
    }


    /**
     * Setzt die Transparenz eines Bildes basierend auf dem Score und fügt Hover-Events hinzu.
     * @param {HTMLElement} item - Das Artikel-Element
     * @param {HTMLElement} imageContainer - Das Bild-Element des Artikels
     * @param {number} score - Der berechnete Score des Artikels
     */
    function applyTransparency(item, imageContainer, score) {
        const transparency = score >= referenceScore ? 0.95 : 0; // Max. 95% Transparenz
        const normalOpacity = (1 - transparency).toString();

        imageContainer.style.transition = "opacity 0.3s ease";
        imageContainer.style.opacity = normalOpacity;

        // Entferne alte Event-Listener
        item.removeEventListener("mouseenter", removeTransparency);
        item.removeEventListener("mouseleave", restoreTransparency);

        // Neue Event-Listener setzen
        function removeTransparency() {
            //console.log(`🖱️ Mouse ENTER auf Artikel: "${item.querySelector('[data-testid$="--overlay-link"]').title}" → Transparenz entfernt`);
            imageContainer.style.opacity = "1";
        }

        function restoreTransparency() {
            //console.log(`🖱️ Mouse LEAVE auf Artikel: "${item.querySelector('[data-testid$="--overlay-link"]').title}" → Transparenz wiederhergestellt (${normalOpacity})`);
            imageContainer.style.opacity = normalOpacity;
        }

        item.addEventListener("mouseenter", removeTransparency);
        item.addEventListener("mouseleave", restoreTransparency);
    }

    /**
     * Erstellt oder aktualisiert das Score-Label für einen Artikel.
     * @param {HTMLElement} item - Das Artikel-Element
     * @param {number} score - Der berechnete Score des Artikels
     */
    function updateScoreLabel(item, score) {
        let scoreLabel = item.querySelector('.score-label');

        if (!scoreLabel) {
            scoreLabel = document.createElement('div');
            scoreLabel.className = 'score-label';
            scoreLabel.style.position = 'absolute';
            scoreLabel.style.top = '5px';
            scoreLabel.style.left = '5px';
            scoreLabel.style.background = 'rgba(0, 0, 0, 0.7)';
            scoreLabel.style.color = 'white';
            scoreLabel.style.padding = '2px 5px';
            scoreLabel.style.fontSize = '12px';
            scoreLabel.style.borderRadius = '3px';
            scoreLabel.style.zIndex = '10';
            item.appendChild(scoreLabel);
        }
        scoreLabel.textContent = `Score: ${score}`;
    }

    /**
     * Scannt alle Artikel auf der Seite und wendet die Transparenz an.
     */
    function markItems() {
        const items = document.querySelectorAll('[data-testid="grid-item"]');
        console.log(`🔍 Gefundene Artikel: ${items.length}`, [...items]);

        items.forEach(item => {
            if (processedItems.has(item)) return;

            const titleElement = item.querySelector('[data-testid$="--overlay-link"]');
            if (!titleElement) return;

            const titleText = titleElement.title.trim();
            if (!titleText) return;

            const score = calculateScore(titleText);

            const imageContainer = item.querySelector('.new-item-box__image-container img');
            if (!imageContainer) return;

            processedItems.add(item);

            // Label hinzufügen oder aktualisieren
            // updateScoreLabel(item, score);

            // Transparenz anwenden + Hover-Funktion aktivieren
            applyTransparency(item, imageContainer, score);
        });
    }


    // Beobachtet die Seite auf Änderungen und aktualisiert die Artikel
    const observer = new MutationObserver(markItems);
    observer.observe(document.body, {childList: true, subtree: true});

    // Startet das Markieren der Artikel beim Laden der Seite
    markItems();
})();

