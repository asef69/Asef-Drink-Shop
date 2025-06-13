document.addEventListener('DOMContentLoaded', function() {
    const searchInput = document.querySelector('.search-input');
    const searchBtn = document.querySelector('.search-btn');
    const cocktailsContainer = document.getElementById('cocktails-container');
    const featuredContainer = document.getElementById('featured-cocktails');
    const pagination = document.getElementById('pagination');
    const toastMessage = document.getElementById('toast-message');
    const alertToast = new bootstrap.Toast(document.getElementById('liveToast'));
    const groupItems = document.getElementById('group-items');
    const groupCount = document.getElementById('group-count');
    const saveGroupBtn = document.getElementById('save-group');
    
    let currentCocktails = [];
    let currentPage = 1;
    const cocktailsPerPage = 8;
    let groupSelection = [];

    init();

    function init() {
        loadRandomCocktails();
        loadFeaturedCocktails();
        searchBtn.addEventListener('click', handleSearch);
        searchInput.addEventListener('keypress', e => {
            if (e.key === 'Enter') handleSearch();
        });
        saveGroupBtn.addEventListener('click', saveGroup);
        animateCounter();
    }

    async function fetchCocktails(url) {
        try {
            const response = await fetch(url);
            if (!response.ok) throw new Error('Network response was not ok');
            const data = await response.json();
            return data.drinks || [];
        } catch (error) {
            console.error('Error fetching cocktails:', error);
            showAlert('Failed to load cocktails. Please try again.');
            return [];
        }
    }

    async function loadRandomCocktails() {
        cocktailsContainer.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';
        try {
            const randomPromises = Array.from({ length: 12 }, () => 
                fetchCocktails('https://www.thecocktaildb.com/api/json/v1/1/random.php')
            );
            const randomResults = await Promise.all(randomPromises);
            currentCocktails = randomResults.flat();
            currentPage = 1;
            displayCocktails();
        } catch (error) {
            console.error('Error loading random cocktails:', error);
            showAlert('Failed to load random cocktails.');
            cocktailsContainer.innerHTML = '<p class="text-center text-muted py-5">Could not load cocktails. Please try again later.</p>';
        }
    }

    async function loadFeaturedCocktails() {
        const featuredDrinks = ['margarita', 'mojito', 'martini', 'manhattan'];
        try {
            const featuredPromises = featuredDrinks.map(drink => 
                fetchCocktails(`https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${drink}`)
            );
            const featuredResults = await Promise.all(featuredPromises);
            const featuredCocktails = featuredResults.flat().slice(0, 4);
            featuredContainer.innerHTML = '';
            featuredCocktails.forEach(cocktail => {
                if (cocktail) {
                    const card = createCocktailCard(cocktail);
                    featuredContainer.appendChild(card);
                }
            });
        } catch (error) {
            console.error('Error loading featured cocktails:', error);
            featuredContainer.innerHTML = '<p class="text-muted">Failed to load featured cocktails</p>';
        }
    }

    async function searchCocktails(query) {
        if (!query.trim()) {
            showAlert('Please enter a search term');
            return;
        }
        cocktailsContainer.innerHTML = '<div class="text-center py-5"><div class="spinner-border text-primary" role="status"><span class="visually-hidden">Loading...</span></div></div>';
        try {
            currentCocktails = await fetchCocktails(`https://www.thecocktaildb.com/api/json/v1/1/search.php?s=${query}`);
            currentPage = 1;
            if (currentCocktails.length === 0) {
                showAlert('No cocktails found matching your search');
                cocktailsContainer.innerHTML = '<p class="text-center text-muted py-5">No cocktails found. Try a different search term.</p>';
            } else {
                displayCocktails();
            }
        } catch (error) {
            console.error('Error searching cocktails:', error);
            showAlert('Failed to search cocktails. Please try again.');
            cocktailsContainer.innerHTML = '<p class="text-center text-muted py-5">Search failed. Please try again.</p>';
        }
    }

    function displayCocktails() {
        if (!currentCocktails || currentCocktails.length === 0) {
            cocktailsContainer.innerHTML = '<p class="text-center text-muted py-5">No cocktails available.</p>';
            return;
        }
        const start = (currentPage - 1) * cocktailsPerPage;
        const end = start + cocktailsPerPage;
        const paginatedCocktails = currentCocktails.slice(start, end);
        cocktailsContainer.innerHTML = '';
        paginatedCocktails.forEach(cocktail => {
            if (cocktail) {
                const card = createCocktailCard(cocktail);
                cocktailsContainer.appendChild(card);
            }
        });
        updatePagination();
    }

    function createCocktailCard(cocktail) {
        const col = document.createElement('div');
        col.className = 'col-md-6 col-lg-4 col-xl-3 mb-4';
        const shortInstructions = cocktail.strInstructions 
            ? cocktail.strInstructions.split(' ').slice(0, 15).join(' ') + '...'
            : 'No instructions available';
        col.innerHTML = `
            <div class="card cocktail-card h-100">
                <img src="${cocktail.strDrinkThumb || 'https://via.placeholder.com/300x300?text=No+Image'}" 
                     class="card-img-top cocktail-img" 
                     alt="${cocktail.strDrink}">
                <div class="card-body d-flex flex-column">
                    <h5 class="card-title cocktail-title">${cocktail.strDrink}</h5>
                    <p class="card-text cocktail-category">
                        <i class="fas fa-glass-martini-alt me-1"></i>
                        ${cocktail.strCategory || 'Unknown category'}
                    </p>
                    <p class="cocktail-instruction">${shortInstructions}</p>
                    <div class="mt-auto cocktail-actions">
                        <button class="btn btn-primary btn-sm add-to-group">
                            <i class="fas fa-plus me-1"></i> Add to Group
                        </button>
                        <button class="btn btn-outline-primary btn-sm view-details">
                            <i class="fas fa-info-circle me-1"></i> Details
                        </button>
                    </div>
                </div>
            </div>
        `;
        col.querySelector('.view-details').addEventListener('click', () => {
            showCocktailDetails(cocktail);
        });
        col.querySelector('.add-to-group').addEventListener('click', () => {
            addToGroup(cocktail);
        });
        return col;
    }

    function showCocktailDetails(cocktail) {
        const modal = new bootstrap.Modal(document.getElementById('cocktailModal'));
        const modalBody = document.getElementById('modal-body-content');
        let ingredientsHtml = '';
        for (let i = 1; i <= 15; i++) {
            const ingredient = cocktail[`strIngredient${i}`];
            const measure = cocktail[`strMeasure${i}`];
            if (ingredient) {
                ingredientsHtml += `
                    <li class="list-group-item d-flex justify-content-between align-items-center">
                        <span>${ingredient}</span>
                        <span class="badge bg-primary rounded-pill">${measure || 'to taste'}</span>
                    </li>
                `;
            }
        }
        modalBody.innerHTML = `
            <div class="row">
                <div class="col-md-5">
                    <img src="${cocktail.strDrinkThumb || 'https://via.placeholder.com/400x400?text=No+Image'}" 
                         class="img-fluid rounded mb-3" 
                         alt="${cocktail.strDrink}">
                    <div class="d-grid gap-2">
                        <button class="btn btn-success add-to-group-modal">
                            <i class="fas fa-users me-1"></i> Add to Group
                        </button>
                    </div>
                </div>
                <div class="col-md-7">
                    <h4>${cocktail.strDrink}</h4>
                    <p><strong>Category:</strong> ${cocktail.strCategory || 'Unknown'}</p>
                    <p><strong>Glass:</strong> ${cocktail.strGlass || 'Unknown'}</p>
                    <p><strong>Type:</strong> ${cocktail.strAlcoholic || 'Unknown'}</p>
                    <p><strong>IBA:</strong> ${cocktail.strIBA || 'Not specified'}</p>
                    <h5 class="mt-4">Ingredients</h5>
                    <ul class="list-group mb-3">${ingredientsHtml}</ul>
                    <h5>Instructions</h5>
                    <p>${cocktail.strInstructions || 'No instructions available.'}</p>
                </div>
            </div>
        `;
        modalBody.querySelector('.add-to-group-modal').addEventListener('click', () => {
            addToGroup(cocktail);
            modal.hide();
        });
        document.getElementById('cocktailModalLabel').textContent = cocktail.strDrink;
        modal.show();
    }

    function updatePagination() {
        if (!currentCocktails || currentCocktails.length <= cocktailsPerPage) {
            pagination.innerHTML = '';
            return;
        }
        const totalPages = Math.ceil(currentCocktails.length / cocktailsPerPage);
        pagination.innerHTML = '';
        const prevLi = document.createElement('li');
        prevLi.className = `page-item ${currentPage === 1 ? 'disabled' : ''}`;
        prevLi.innerHTML = `<a class="page-link" href="#" aria-label="Previous"><span aria-hidden="true">&laquo;</span></a>`;
        prevLi.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentPage > 1) {
                currentPage--;
                displayCocktails();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
        pagination.appendChild(prevLi);
        for (let i = 1; i <= totalPages; i++) {
            const pageLi = document.createElement('li');
            pageLi.className = `page-item ${i === currentPage ? 'active' : ''}`;
            pageLi.innerHTML = `<a class="page-link" href="#">${i}</a>`;
            pageLi.addEventListener('click', (e) => {
                e.preventDefault();
                currentPage = i;
                displayCocktails();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            });
            pagination.appendChild(pageLi);
        }
        const nextLi = document.createElement('li');
        nextLi.className = `page-item ${currentPage === totalPages ? 'disabled' : ''}`;
        nextLi.innerHTML = `<a class="page-link" href="#" aria-label="Next"><span aria-hidden="true">&raquo;</span></a>`;
        nextLi.addEventListener('click', (e) => {
            e.preventDefault();
            if (currentPage < totalPages) {
                currentPage++;
                displayCocktails();
                window.scrollTo({ top: 0, behavior: 'smooth' });
            }
        });
        pagination.appendChild(nextLi);
    }

    function addToGroup(cocktail) {
        if (groupSelection.some(item => item.idDrink === cocktail.idDrink)) {
            showAlert(`${cocktail.strDrink} is already in your group!`);
            return;
        }
        if (groupSelection.length >= 7) {
            showAlert('You can only add up to 7 drinks to a group!');
            return;
        }
        groupSelection.push(cocktail);
        updateGroupDisplay();
        showAlert(`${cocktail.strDrink} added to your group!`);
    }

    function updateGroupDisplay() {
        if (groupSelection.length === 0) {
            groupItems.innerHTML = '<p class="text-muted">No drinks selected yet</p>';
        } else {
            groupItems.innerHTML = '';
            groupSelection.forEach((cocktail, index) => {
                const li = document.createElement('li');
                li.className = 'list-group-item';
                li.innerHTML = `
                    <span>${cocktail.strDrink}</span>
                    <i class="fas fa-times remove-item" data-index="${index}"></i>
                `;
                groupItems.appendChild(li);
            });
            document.querySelectorAll('.remove-item').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const index = parseInt(e.target.getAttribute('data-index'));
                    removeFromGroup(index);
                });
            });
        }
        groupCount.textContent = groupSelection.length;
    }

    function removeFromGroup(index) {
        groupSelection.splice(index, 1);
        updateGroupDisplay();
    }

    function saveGroup() {
        if (groupSelection.length === 0) {
            showAlert('Please add some drinks to your group first!');
            return;
        }
        showAlert(`Group with ${groupSelection.length} drinks saved successfully!`);
        console.log('Group saved:', groupSelection);
    }

    function handleSearch() {
        const searchTerm = searchInput.value.trim();
        if (searchTerm) {
            searchCocktails(searchTerm);
        } else {
            showAlert('Please enter a search term');
        }
    }

    function showAlert(message) {
        toastMessage.textContent = message;
        alertToast.show();
    }
    
    function animateCounter() {
        const counters = document.querySelectorAll('.stat-number');
        const speed = 200;
        counters.forEach(counter => {
            const target = +counter.getAttribute('data-count');
            const count = +counter.innerText;
            const increment = target / speed;
            if (count < target) {
                counter.innerText = Math.ceil(count + increment);
                setTimeout(animateCounter, 1);
            } else {
                counter.innerText = target.toLocaleString();
            }
        });
    }
});
