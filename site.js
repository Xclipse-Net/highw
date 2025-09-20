// ===== CONFIGURATION =====
const launchDate = new Date('2025-11-20T17:00:00+09:30'); // Adelaide launch
const manualProgress = 69; // Progress bar 69%
const webhookURL = 'https://discord.com/api/webhooks/1418912007637307403/Ufte75d__wY7bHE5gWts_UKOYZwjFIpCA9sFK1vQ2JOFCSIJj9nVRs_aTo-2fZ4TUh6c';

// ===== COUNTDOWN =====
function updateCountdown(){
    const now = new Date();
    const diff = launchDate - now;

    const days = diff>0 ? Math.floor(diff/(1000*60*60*24)) : 0;
    const hours = diff>0 ? Math.floor((diff/(1000*60*60))%24) : 0;
    const minutes = diff>0 ? Math.floor((diff/(1000*60))%60) : 0;
    const seconds = diff>0 ? Math.floor((diff/1000)%60) : 0;

    document.getElementById('days').textContent = String(days).padStart(2,'0');
    document.getElementById('hours').textContent = String(hours).padStart(2,'0');
    document.getElementById('minutes').textContent = String(minutes).padStart(2,'0');
    document.getElementById('seconds').textContent = String(seconds).padStart(2,'0');

    document.getElementById('progressBar').style.width = manualProgress + '%';

    document.getElementById('launchNote').textContent = 'Estimated launch: ' +
        launchDate.toLocaleString('en-AU', { timeZone:'Australia/Adelaide', weekday:'long', year:'numeric', month:'long', day:'numeric', hour:'2-digit', minute:'2-digit' });
}

setInterval(updateCountdown,1000);
updateCountdown();

// ===== POPUP ELEMENTS =====
const subscribeForm = document.getElementById('subscribeForm');
const successPopup = document.getElementById('successPopup');
const popupMessage = document.getElementById('popupMessage');
const closePopup = document.getElementById('closePopup');

// ===== SUBSCRIBE FORM TO DISCORD =====
subscribeForm.addEventListener('submit', async e => {
    e.preventDefault();
    const email = document.getElementById('email').value;
    const payload = { content: `📧 New email subscription: **${email}**` };

    try {
        await fetch(webhookURL, {
            method:'POST',
            headers:{ 'Content-Type':'application/json' },
            body:JSON.stringify(payload)
        });

        // Show popup
popupMessage.textContent = `📧 Thank you! ${email} has been added to our list.`;
successPopup.style.display = 'flex';

        subscribeForm.reset();
    } catch (err) {
        popupMessage.textContent = 'Oops! Something went wrong. Please try again.';
        successPopup.style.display = 'flex';
        console.error(err);
    }
});

// Close popup
closePopup.addEventListener('click', () => {
    successPopup.style.display = 'none';
});
