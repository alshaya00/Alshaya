# Roadmap - شجرة عائلة آل شايع

## Completed Features

### v1.0 - Core Features
- [x] Interactive D3.js family tree visualization
- [x] Member registry with search and filtering
- [x] Quick add form for new members
- [x] Analytics dashboard
- [x] Member detail pages
- [x] Lineage tracking (Gen 2 & Gen 3 branches)
- [x] Photo gallery with upload approval system
- [x] User authentication and roles
- [x] Admin dashboard

### v1.1 - Breastfeeding Relationships (علاقات الرضاعة)
- [x] **Database Schema**: `BreastfeedingRelationship` model in Prisma
- [x] **Mini Family Graph**: D3.js component showing immediate family on member detail page
  - Father, siblings, children, grandchildren (blood family)
  - Milk mother, milk father, milk siblings (milk family)
  - Visual distinction: solid lines for bloodline, dotted teal lines for breastfeeding
- [x] **API Endpoints**:
  - `GET/POST /api/breastfeeding` - List and create relationships
  - `GET/PUT/DELETE /api/breastfeeding/[id]` - Manage specific relationship
  - `GET /api/members/[id]/breastfeeding` - Get milk families for a member
- [x] **Member Detail Page Integration**:
  - Mini family graph component
  - Breastfeeding section showing milk mother, milk father, and milk siblings
- [x] **TypeScript Interfaces**: Full type support for breastfeeding relationships

## In Progress

### v1.2 - Breastfeeding UI Enhancements
- [ ] Add breastfeeding relationship form in member edit page
- [ ] Bulk import breastfeeding data
- [ ] Export breastfeeding relationships
- [ ] Show breastfeeding in main family tree view (toggle option)

## Planned Features

### v1.3 - Enhanced Relationships
- [ ] Spouse/marriage relationships
- [ ] Multiple mothers (biological, adoptive)
- [ ] Timeline view of family events
- [ ] Family events (births, deaths, marriages)

### v1.4 - Collaboration Features
- [ ] Family member suggestions/corrections
- [ ] Pending changes approval workflow
- [ ] Email notifications for approvals
- [ ] Activity feed

### v1.5 - Advanced Visualization
- [ ] 3D family tree view
- [ ] Geographic map of family locations
- [ ] Timeline slider for historical view
- [ ] Print-friendly tree layout

### v2.0 - Mobile App
- [ ] React Native mobile application
- [ ] Offline access
- [ ] Push notifications
- [ ] Camera integration for photos

## Technical Debt
- [ ] Improve test coverage
- [ ] Performance optimization for large trees
- [ ] Accessibility improvements (WCAG 2.1)
- [ ] SEO optimization

## Database Migration Notes

To apply the breastfeeding relationship schema:

```bash
# Generate Prisma client
npx prisma generate

# Create migration
npx prisma migrate dev --name add-breastfeeding-relationships

# Or push directly (development only)
npx prisma db push
```

## Contributing

See [README.md](./README.md) for contribution guidelines.

---

*Last updated: December 2024*
