document.addEventListener("DOMContentLoaded", function () {
    const scoreDropdown = document.getElementById("scoreThreshold");

    // Lade gespeicherte Einstellungen
    chrome.storage.sync.get(["referenceScore"], function (result) {
        if (result.referenceScore !== undefined) {
            scoreDropdown.value = result.referenceScore; // Setze gespeicherten Wert
        }
    });

    document.getElementById("save").addEventListener("click", function () {
        let newScore = parseInt(scoreDropdown.value);
        chrome.storage.sync.set({ referenceScore: newScore }, function () {
            alert("Einstellungen gespeichert!");
        });
    });
});
