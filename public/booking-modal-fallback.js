(function () {
  function findParentCell(element) {
    var node = element;
    while (node && node !== document.body) {
      if (node.tagName === 'TD') return node;
      node = node.parentElement;
    }
    return null;
  }

  function bindFallbackModalHandlers() {
    var form = document.getElementById('booking-form');
    var tableBody = document.getElementById('booking-table-body');
    var slotInput = document.getElementById('slotId');
    var slotStartInput = document.getElementById('slotStartAt');
    var selectedSlotText = document.getElementById('selected-slot');
    var bookingModal = document.getElementById('booking-modal');
    var bookingModalClose = document.getElementById('booking-modal-close');
    var bookingModalBackdrop = document.getElementById('booking-modal-backdrop');

    if (!form || !tableBody || !bookingModal || !slotInput || !slotStartInput) return;

    function closeModal() {
      bookingModal.hidden = true;
      bookingModal.setAttribute('aria-hidden', 'true');
      document.body.classList.remove('booking-modal-open');
    }

    function openModal() {
      bookingModal.hidden = false;
      bookingModal.setAttribute('aria-hidden', 'false');
      document.body.classList.add('booking-modal-open');
    }

    if (bookingModalClose && !bookingModalClose.dataset.fallbackBound) {
      bookingModalClose.dataset.fallbackBound = '1';
      bookingModalClose.addEventListener('click', closeModal);
    }
    if (bookingModalBackdrop && !bookingModalBackdrop.dataset.fallbackBound) {
      bookingModalBackdrop.dataset.fallbackBound = '1';
      bookingModalBackdrop.addEventListener('click', closeModal);
    }

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape') closeModal();
    });

    function bindButtons() {
      var buttons = tableBody.querySelectorAll('.booking-slot-btn--fallback');
      buttons.forEach(function (button) {
        if (button.dataset.fallbackBound === '1') return;
        button.dataset.fallbackBound = '1';

        var dayKey = button.getAttribute('data-fallback-day') || '';
        var timeKey = button.getAttribute('data-fallback-time') || '';
        var isoDate = dayKey && timeKey ? new Date(dayKey + 'T' + timeKey + ':00') : null;
        if (!isoDate || Number.isNaN(isoDate.getTime())) return;

        var slotId = 'ui-fallback-' + dayKey + '-' + String(timeKey).replace(':', '');
        var readable = dayKey + ' ' + timeKey;

        function selectFallbackSlot() {
          slotInput.value = slotId;
          slotStartInput.value = isoDate.toISOString();
          if (selectedSlotText) {
            selectedSlotText.textContent = 'Vybraný termín: ' + readable;
            selectedSlotText.classList.add('selected-slot--active');
          }
          openModal();
        }

        button.addEventListener('click', function (event) {
          event.preventDefault();
          event.stopPropagation();
          selectFallbackSlot();
        });

        var cell = findParentCell(button);
        if (cell) {
          cell.classList.add('booking-cell--clickable');
          cell.addEventListener('click', function () {
            selectFallbackSlot();
          });
        }
      });
    }

    bindButtons();
    var observer = new MutationObserver(function () {
      bindButtons();
    });
    observer.observe(tableBody, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', bindFallbackModalHandlers);
  } else {
    bindFallbackModalHandlers();
  }
})();
