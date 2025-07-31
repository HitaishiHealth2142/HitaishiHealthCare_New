document.addEventListener("DOMContentLoaded", () => {
    const userId = localStorage.getItem("userId");
    const firstName = localStorage.getItem("first_name");
    const fullName = localStorage.getItem("fullName") || "Patient";
    
    console.log("🔍 Loaded from localStorage:", { 
      userId, 
      firstName, 
      fullName,
      allStorage: JSON.stringify(localStorage) // Log all localStorage for debugging
    });

    if (userId) {
        const navbar = document.querySelector("#navLinks2");
        if (navbar) {
            navbar.innerHTML += `
                <div style="display:flex;align-items:center;gap:10px;">
                    <div style="width:34px;height:34px;background:#000;color:white;border-radius:50%;
                                display:flex;align-items:center;justify-content:center;font-weight:bold;cursor:pointer;">
                        ${fullName.charAt(0).toUpperCase()}
                    </div>
                    <span style="color:white;font-weight:bold;">${fullName}</span>
                    <button onclick="logout()" style="background:red;color:white;border:none;
                            border-radius:4px;padding:5px 10px;cursor:pointer;">
                        Logout
                    </button>
                </div>`;
        }
    }
});

function logout() {
    localStorage.clear();
    window.location.href = "patientLogin.html";
}