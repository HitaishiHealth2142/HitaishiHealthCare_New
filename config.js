let API_BASE_URL = "";

async function loadConfig() {
  const response = await fetch("/urls.json");
  const config = await response.json();
  API_BASE_URL = config.API_BASE_URL;
}