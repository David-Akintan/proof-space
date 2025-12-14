(define-data-var entry-count uint u0)
(define-data-var event-count uint u0)
(define-data-var ticket-count uint u0)
(define-data-var owner principal 'ST000000000000000000002AMW42H)

;; Map of IP entries
(define-map ips
  { id: uint }
  {
    ipfs-hash: (string-ascii 128),
    title: (string-ascii 128),
    description: (string-ascii 512),
    license-type: (string-ascii 64),
    owner: principal,
    file-hash: (string-ascii 128),
    filename: (string-ascii 128),
    category: (string-ascii 64),
    timestamp: uint,
  }
)

;; Map of events
(define-map events
  { id: uint }
  {
    ipfs-hash: (string-ascii 128),
    title: (string-ascii 128),
    description: (string-ascii 512),
    location: (string-ascii 128),
    event-date: uint,
    ticket-price: uint,
    max-tickets: uint,
    sold-tickets: uint,
    organizer: principal,
    category: (string-ascii 64),
    timestamp: uint,
    is-active: bool,
  }
)

;; Map of tickets
(define-map tickets
  { id: uint }
  {
    event-id: uint,
    owner: principal,
    ticket-id: uint,
    purchase-time: uint,
    is-valid: bool,
  }
)

;; ---------------------------
;; Admin / ownership helpers
;; ---------------------------

(define-private (is-owner (caller principal))
  (is-eq caller (var-get owner))
)

(define-public (set-owner (new-owner principal))
  (begin
    (asserts! (is-eq (var-get owner) 'ST000000000000000000002AMW42H) (err u100))
    (asserts! (not (is-eq new-owner (var-get owner))) (err u101))
    (ok (var-set owner new-owner))
  )
)

;; ---------------------------
;; IP functions
;; ---------------------------

(define-public (register-ip
    (ipfs-hash (string-ascii 128))
    (title (string-ascii 128))
    (description (string-ascii 512))
    (license-type (string-ascii 64))
    (file-hash (string-ascii 128))
    (category (string-ascii 64))
    (filename (string-ascii 128))
  )
  (let (
      (id (var-get entry-count))
      (ts stacks-block-height)
    )
    (begin
      (asserts! (> (len title) u0) (err u1))
      (asserts! (> (len ipfs-hash) u0) (err u2))
      (asserts! (> (len license-type) u0) (err u3))
      (asserts! (> (len description) u0) (err u4))
      (asserts! (> (len file-hash) u0) (err u5))
      (asserts! (> (len filename) u0) (err u6))
      (asserts! (> (len category) u0) (err u7))

      (map-set ips { id: id } {
        ipfs-hash: ipfs-hash,
        title: title,
        description: description,
        license-type: license-type,
        owner: tx-sender,
        file-hash: file-hash,
        filename: filename,
        category: category,
        timestamp: ts,
      })

      (var-set entry-count (+ id u1))
      (ok id)
    )
  )
)

(define-read-only (get-ip (id uint))
  (map-get? ips { id: id })
)

(define-read-only (get-ip-count)
  (ok (var-get entry-count))
)

;; ---------------------------
;; Event functions
;; ---------------------------

(define-public (create-event
    (ipfs-hash (string-ascii 128))
    (title (string-ascii 128))
    (description (string-ascii 512))
    (location (string-ascii 128))
    (event-date uint)
    (ticket-price uint)
    (max-tickets uint)
    (category (string-ascii 64))
  )
  (let (
      (id (var-get event-count))
      (ts stacks-block-height)
    )
    (begin
      (asserts! (> event-date ts) (err u20))
      (asserts! (> max-tickets u0) (err u21))
      (asserts! (> (len title) u0) (err u22))
      (asserts! (> (len ipfs-hash) u0) (err u23))
      (asserts! (> (len description) u0) (err u24))
      (asserts! (> (len location) u0) (err u25))
      (asserts! (> (len category) u0) (err u26))
      (asserts! (>= ticket-price u0) (err u29))

      (map-set events { id: id } {
        ipfs-hash: ipfs-hash,
        title: title,
        description: description,
        location: location,
        event-date: event-date,
        ticket-price: ticket-price,
        max-tickets: max-tickets,
        sold-tickets: u0,
        organizer: tx-sender,
        category: category,
        timestamp: ts,
        is-active: true,
      })

      (var-set event-count (+ id u1))
      (ok id)
    )
  )
)

(define-read-only (get-event (id uint))
  (map-get? events { id: id })
)

(define-read-only (get-event-count)
  (ok (var-get event-count))
)

(define-public (deactivate-event (id uint))
  (begin
    (asserts! (< id (var-get event-count)) (err u43))
    (let ((ev (unwrap! (map-get? events { id: id }) (err u42)))
          (updated-event (merge ev { is-active: false })))
      (begin
        (asserts! (is-eq (get organizer ev) tx-sender) (err u40))
        (asserts! (get is-active ev) (err u41))
        (ok (map-set events { id: id } updated-event))
      )
    )
  )
)

(define-public (update-event-details
    (id uint)
    (description (string-ascii 512))
    (location (string-ascii 128))
  )
  (begin
    (asserts! (< id (var-get event-count)) (err u53))
    (match (map-get? events { id: id })
      ev (begin
        (asserts! (is-eq (get organizer ev) tx-sender) (err u50))
        (asserts! (get is-active ev) (err u51))
        (ok (map-set events { id: id }
          (merge ev {
            description: description,
            location: location,
          })
        ))
      )
      (err u52)
    )
  )
)

;; ---------------------------
;; Ticketing functions
;; ---------------------------

(define-public (purchase-ticket (event-id uint))
  (begin
    (asserts! (< event-id (var-get event-count)) (err u66))
    (match (map-get? events { id: event-id })
      ev (let (
          (price (get ticket-price ev))
          (sold (get sold-tickets ev))
          (max (get max-tickets ev))
          (organizer (get organizer ev))
        )
      (begin
        (asserts! (get is-active ev) (err u60))
        (asserts! (> (get event-date ev) stacks-block-height) (err u61))
        (asserts! (< sold max) (err u62))
        (asserts! (not (is-eq tx-sender organizer)) (err u63))

        (match (stx-transfer? price tx-sender organizer)
          success (let (
              (tid (var-get ticket-count))
              (ts stacks-block-height)
            )
            (begin
              (map-set tickets { id: tid } {
                event-id: event-id,
                owner: tx-sender,
                ticket-id: tid,
                purchase-time: ts,
                is-valid: true,
              })

              (map-set events { id: event-id }
                (merge ev { sold-tickets: (+ sold u1) })
              )

              (var-set ticket-count (+ tid u1))
              (ok tid)
            )
          )
          error (err u64)
        )))
      (err u65))
  )
)

(define-read-only (get-ticket (id uint))
  (map-get? tickets { id: id })
)

(define-read-only (get-ticket-count)
  (ok (var-get ticket-count))
)

;; Simple ticket checker - checks first 10 possible tickets
;; For production, implement off-chain indexing
(define-read-only (has-ticket-for-event
    (user principal)
    (event-id uint)
  )
  (or
    (check-ticket-at-index user event-id u0)
    (check-ticket-at-index user event-id u1)
    (check-ticket-at-index user event-id u2)
    (check-ticket-at-index user event-id u3)
    (check-ticket-at-index user event-id u4)
    (check-ticket-at-index user event-id u5)
    (check-ticket-at-index user event-id u6)
    (check-ticket-at-index user event-id u7)
    (check-ticket-at-index user event-id u8)
    (check-ticket-at-index user event-id u9)
  )
)

(define-private (check-ticket-at-index
    (user principal)
    (event-id uint)
    (ticket-index uint)
  )
  (match (map-get? tickets { id: ticket-index })
    t (and
      (is-eq (get owner t) user)
      (is-eq (get event-id t) event-id)
      (get is-valid t)
    )
    false
  )
)

;; End of contract
