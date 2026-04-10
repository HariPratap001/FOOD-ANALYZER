// Read the API Key securely from config.js or from localStorage (if the user inputs it)
let appApiKey = typeof API_KEY !== 'undefined' ? API_KEY : localStorage.getItem('gemini_api_key');

if (!appApiKey) {
    appApiKey = prompt("Please enter your Gemini API Key to use this app:");
    if (appApiKey) {
        localStorage.setItem('gemini_api_key', appApiKey);
    }
}

document.getElementById('analyzeBtn').addEventListener('click', analyzeFood);
document.getElementById('foodInput').addEventListener('keypress', function (e) {
    if (e.key === 'Enter') analyzeFood();
});

async function analyzeFood() {
    const foodName = document.getElementById('foodInput').value.trim();
    if (!foodName) return;

    // UI State
    document.getElementById('loading').classList.remove('hidden');
    document.getElementById('resultSection').classList.add('hidden');

    try {
        if (!appApiKey) {
            alert("An API Key is required to analyze food. Please refresh the page and enter it.");
            return;
        }

        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${appApiKey}`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                systemInstruction: {
                    parts: [
                        { text: "You are a professional nutritionist AI. Your job is to return precise nutritional information for the food item requested by the user. You MUST return ONLY valid JSON and nothing else. Structure the JSON object exactly like this, using standard measurement units where appropriate: { \"name\": \"string\", \"description\": \"string\", \"health_rating\": number (1-10), \"calories\": \"string\", \"protein\": \"string\", \"fat\": \"string\", \"carbs\": \"string\", \"vitamins\": [\"string\"], \"minerals\": [\"string\"], \"other_stuff\": \"string\" }." }
                    ]
                },
                contents: [{
                    parts: [{
                        text: `Provide the nutritional data for: ${foodName}`
                    }]
                }],
                generationConfig: {
                    temperature: 0.1,
                    responseMimeType: "application/json"
                }
            })
        });

        if (!response.ok) {
            const errBody = await response.text();

            if (response.status === 429) {
                console.warn("API quota exceeded. Displaying MOCK DATA for layout testing.");
                const mockData = {
                    "name": "Apple (Mock Data)",
                    "description": "API QUOTA EXCEEDED - MOCK DATA: A crisp, sweet fruit. (You hit your Google Cloud Project limit so we are showing this dummy data to let you keep designing).",
                    "health_rating": 9,
                    "calories": "95 kcal",
                    "protein": "0.5 g",
                    "fat": "0.3 g",
                    "carbs": "25 g",
                    "vitamins": ["Vitamin C (14%)", "Vitamin B6", "Potassium"],
                    "minerals": ["Calcium", "Magnesium"],
                    "other_stuff": "You can keep building your UI for now using this mock data!"
                };
                updateUI(mockData);
                return;
            }

            if (response.status === 503) {
                alert("The AI servers are currently completely overloaded (503 High Demand). This is a Google server issue, not your code! Please wait a few seconds and try clicking 'Analyze' again.");
                return;
            }

            throw new Error(`API Error: ${response.status} - ${errBody}`);
        }

        const data = await response.json();
        
        // Gemini response is in data.candidates[0].content.parts[0].text
        let textResponse = data.candidates[0].content.parts[0].text;
        
        // Clean markdown backticks if present robustly
        let startIndex = textResponse.indexOf('{');
        let endIndex = textResponse.lastIndexOf('}');
        if(startIndex !== -1 && endIndex !== -1) {
            textResponse = textResponse.substring(startIndex, endIndex + 1);
        }
        
        const nutritionalData = JSON.parse(textResponse);

        updateUI(nutritionalData);

    } catch (error) {
        console.error("Error fetching data:", error);
        alert(`Failed to analyze food. Error: ${error.message}`);
    } finally {
        document.getElementById('loading').classList.add('hidden');
    }
}

function updateUI(data) {
    document.getElementById('foodName').textContent = data.name || "Unknown";
    document.getElementById('foodDescription').textContent = data.description || "No description provided.";
    
    // Health Rating
    const hr = Math.round(data.health_rating) || 0;
    document.getElementById('healthRating').textContent = hr;
    
    const badge = document.getElementById('healthBadge');
    let ratingColor = "var(--rating-excellent)";
    
    if (hr < 4) {
        ratingColor = "var(--rating-poor)";
    } else if (hr < 7) {
        ratingColor = "var(--rating-fair)";
    } else if (hr < 9) {
        ratingColor = "var(--rating-good)";
    }
    
    badge.style.backgroundColor = ratingColor;
    badge.style.boxShadow = `0 0 20px ${ratingColor}`; // Glowing effect
    if(hr < 4) badge.style.color = "white"; // ensure contrast
    else badge.style.color = "black";

    // Macros
    document.getElementById('valCalories').textContent = data.calories || "--";
    document.getElementById('valProtein').textContent = data.protein || "--";
    document.getElementById('valFat').textContent = data.fat || "--";
    document.getElementById('valCarbs').textContent = data.carbs || "--";

    // Lists (Robustly force arrays)
    let vitamins = data.vitamins || ["None specified"];
    if(!Array.isArray(vitamins)) vitamins = [vitamins];
    
    let minerals = data.minerals || ["None specified"];
    if(!Array.isArray(minerals)) minerals = [minerals];

    document.getElementById('valVitamins').innerHTML = vitamins.map(v => `<li>${v}</li>`).join('');
    document.getElementById('valMinerals').innerHTML = minerals.map(m => `<li>${m}</li>`).join('');
    
    // Other
    document.getElementById('valOther').textContent = data.other_stuff || "No additional information.";

    // Show Result
    document.getElementById('resultSection').classList.remove('hidden');
}

// ==========================================
// THee.js 3D Background Animation
// ==========================================
function initThreeJS() {
    const canvas = document.getElementById('three-canvas');
    if (!canvas) return;

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    const renderer = new THREE.WebGLRenderer({ canvas: canvas, alpha: true, antialias: true });
    
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    // Create Particles
    const particlesGeometry = new THREE.BufferGeometry();
    const particlesCount = 700;
    const posArray = new Float32Array(particlesCount * 3);

    for(let i = 0; i < particlesCount * 3; i++) {
        posArray[i] = (Math.random() - 0.5) * 10;
    }

    particlesGeometry.setAttribute('position', new THREE.BufferAttribute(posArray, 3));

    // Material with cyan/blue tint
    const particlesMaterial = new THREE.PointsMaterial({
        size: 0.02,
        color: 0x00e5ff,
        transparent: true,
        opacity: 0.8,
        blending: THREE.AdditiveBlending
    });

    const particlesMesh = new THREE.Points(particlesGeometry, particlesMaterial);
    scene.add(particlesMesh);

    camera.position.z = 3;

    // Mouse Interaction
    let mouseX = 0;
    let mouseY = 0;
    let targetX = 0;
    let targetY = 0;

    const windowHalfX = window.innerWidth / 2;
    const windowHalfY = window.innerHeight / 2;

    document.addEventListener('mousemove', (event) => {
        mouseX = (event.clientX - windowHalfX);
        mouseY = (event.clientY - windowHalfY);
    });

    // Animation Loop
    const clock = new THREE.Clock();

    function animate() {
        requestAnimationFrame(animate);
        const elapsedTime = clock.getElapsedTime();

        targetX = mouseX * 0.001;
        targetY = mouseY * 0.001;

        particlesMesh.rotation.y += 0.05 * (targetX - particlesMesh.rotation.y);
        particlesMesh.rotation.x += 0.05 * (targetY - particlesMesh.rotation.x);
        particlesMesh.position.z = -0.5 + Math.sin(elapsedTime * 0.2) * 0.2;

        renderer.render(scene, camera);
    }
    animate();

    // Handle Resize
    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
    });
}

// Initialize 3D Background
initThreeJS();
