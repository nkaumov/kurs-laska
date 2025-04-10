document.addEventListener('DOMContentLoaded', function () {
    const cartButtons = document.querySelectorAll('.add-to-cart');
  
    cartButtons.forEach(btn => {
      btn.addEventListener('click', () => {
        const id = btn.dataset.id;
        const name = btn.dataset.name;
        const price = parseFloat(btn.dataset.price);
        const qtyInput = document.querySelector(`.item-qty[data-id="${id}"]`);
        const quantity = qtyInput ? parseInt(qtyInput.value) || 1 : 1;
  
        let cart = JSON.parse(localStorage.getItem('cart')) || [];
  
        const existing = cart.find(item => item.id === id);
        if (existing) {
          existing.quantity += quantity;
        } else {
          cart.push({ id, name, price, quantity });
        }
  
        localStorage.setItem('cart', JSON.stringify(cart));
        M.toast({ html: 'Добавлено в корзину', displayLength: 1500 });
      });
    });
  
    if (window.location.pathname === '/cart') {
      renderCart();
    }
  
    function renderCart() {
      const cart = JSON.parse(localStorage.getItem('cart')) || [];
      const container = document.querySelector('#cartItems');
      const totalSpan = document.querySelector('#totalPrice');
      const hiddenInput = document.querySelector('#cartData');
  
      if (cart.length === 0) {
        container.innerHTML = '<p>Корзина пуста</p>';
        totalSpan.textContent = '0';
        return;
      }
  
      let html = '';
      let total = 0;
  
      cart.forEach((item, index) => {
        const subtotal = item.price * item.quantity;
        total += subtotal;
        html += `
          <li class="collection-item">
            ${item.name} — ${item.price} ₽ × 
            <input type="number" class="cart-qty" data-index="${index}" value="${item.quantity}" min="1" style="width: 60px; margin: 0 10px;">
            = <b>${subtotal.toFixed(2)} ₽</b>
            <button class="secondary-content btn-flat red-text remove-item" data-index="${index}">
              <i class="material-icons">close</i>
            </button>
          </li>`;
      });
  
      container.innerHTML = html;
      totalSpan.textContent = total.toFixed(2);
      hiddenInput.value = JSON.stringify(cart);
  
      // Обработка удаления
      document.querySelectorAll('.remove-item').forEach(btn => {
        btn.addEventListener('click', () => {
          const index = parseInt(btn.dataset.index);
          cart.splice(index, 1);
          localStorage.setItem('cart', JSON.stringify(cart));
          location.reload();
        });
      });
  
      // Обработка изменения количества
      document.querySelectorAll('.cart-qty').forEach(input => {
        input.addEventListener('change', () => {
          const index = parseInt(input.dataset.index);
          const newQty = parseInt(input.value) || 1;
          cart[index].quantity = newQty;
          localStorage.setItem('cart', JSON.stringify(cart));
          renderCart(); // перерисуем
        });
      });
    }
  });
  