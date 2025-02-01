document.addEventListener("DOMContentLoaded", function () {
    const scoreInput = document.getElementById("scoreThreshold");

    // Lade gespeicherte Einstellungen
    chrome.storage.sync.get(["referenceScore"], function (result) {
        if (result.referenceScore) {
            scoreInput.value = result.referenceScore;
        }
    });

    document.getElementById("save").addEventListener("click", function () {
        let newScore = parseInt(scoreInput.value);
        chrome.storage.sync.set({ referenceScore: newScore }, function () {
            alert("Einstellungen gespeichert!");
        });
    });
});

