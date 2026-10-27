<template>
  <div class="result-container">
    <div class="lower-shade"></div>

    <NavBar @brand-click="goBack" @cta-click="goBack" />

    <main class="result-main">
      <div v-if="tripPlan" class="content-wrapper">
        <div class="top-switch-nav">
          <div class="top-switch-menu-wrap">
            <a-menu class="top-switch-menu" mode="horizontal" :selected-keys="[activeSection]" @click="scrollToSection">
              <a-menu-item key="overview">
                <span>{{ t('result.side.overview') }}</span>
              </a-menu-item>
              <a-menu-item key="budget" v-if="tripPlan.budget">
                <span>{{ t('result.side.budget') }}</span>
              </a-menu-item>
              <a-menu-item key="map">
                <span>{{ t('result.side.map') }}</span>
              </a-menu-item>
              <a-menu-item key="days">
                <span>{{ t('result.side.days') }}</span>
              </a-menu-item>
              <a-menu-item key="knowledge-graph">
                <span>{{ t('result.side.graph') }}</span>
              </a-menu-item>
              <a-menu-item key="weather" v-if="tripPlan.weather_info && tripPlan.weather_info.length > 0">
                <span>{{ t('result.side.weather') }}</span>
              </a-menu-item>
            </a-menu>
          </div>

          <div class="top-switch-actions">
            <a-space size="middle" wrap>
              <a-button type="default" :loading="mapRefreshing" @click="refreshMap">
                {{ t('result.refreshMap') }}
              </a-button>
              <a-button v-if="!editMode" @click="toggleEditMode" type="default">
                {{ t('result.editTrip') }}
              </a-button>
              <a-button v-else @click="saveChanges" type="primary">
                {{ t('result.saveChanges') }}
              </a-button>
              <a-button v-if="editMode" @click="cancelEdit" type="default">
                {{ t('result.cancelEdit') }}
              </a-button>

              <a-button v-if="!editMode" type="default" :loading="exportingRoadbook" @click="exportAsHtml">
                {{ t('result.exportRoadbook') }}
              </a-button>
              <a-button v-if="!editMode" type="default" @click="exportAsMarkdown">
                {{ t('result.exportMarkdown') }}
              </a-button>
            </a-space>
          </div>
        </div>

      <!-- 主内容区 -->
        <a-card
          v-show="activeSection === 'overview'"
          id="overview"
          :bordered="false"
          class="overview-card section-shellless"
        >
          <div v-if="overviewAttractions.length > 0" ref="overviewSwiperContainerRef" class="overview-swiper">
            <div class="swiper">
              <div class="swiper-wrapper">
                <OverviewAttractionCard
                  v-for="(item, index) in overviewAttractions"
                  :key="`${item.dayArrayIndex}-${item.order}-${item.name}`"
                  :item="item"
                  :image-src="getAttractionImage(item.name, index)"
                  :active="activeOverviewCard === index"
                  @hover="setActiveOverviewCard(index)"
                  @image-error="handleImageError"
                  @select-day="goToDayFromOverview"
                />
              </div>
            </div>
          </div>
          <a-empty v-else :description="t('common.noData')" />
          <!-- 计划名称：查看模式显示（无自定义名则显示城市），编辑模式可改 -->
          <div class="plan-title-row">
            <a-input
              v-if="editMode"
              v-model:value="tripPlan.title"
              size="large"
              class="plan-title-input"
              :placeholder="t('result.planTitlePlaceholder')"
              allow-clear
            />
            <h2 v-else class="plan-title">{{ tripPlan.title || tripPlan.city }}</h2>
          </div>
          <div class="overview-meta">
            <span class="overview-meta-item" style="color: #ffd5c6; font-weight: 700;">
              {{ t('result.dateRange', { start: tripPlan.start_date, end: tripPlan.end_date }) }}
            </span>
            <span v-if="planId" class="overview-meta-item">
              Plan ID: {{ planId }}
            </span>
            <span v-if="tripPlan.overall_suggestions" class="overview-meta-item">
              {{ tripPlan.overall_suggestions }}
            </span>
          </div>
        </a-card>

        <!-- 顶部信息区:预算/地图 -->
        <div class="top-info-section" v-show="['budget', 'map'].includes(activeSection)">
          <div class="left-info" v-show="activeSection === 'budget'">
            <a-card
              v-show="activeSection === 'budget' && !!tripPlan.budget"
              id="budget"
              v-if="tripPlan.budget"
              :bordered="false"
              class="budget-card section-shellless"
            >
              <div class="budget-detail-panel">
                <div class="budget-toolbar">
                  <div class="budget-toolbar-item">
                    <span class="budget-toolbar-label">{{ t('result.budget.filterLabel') }}</span>
                    <a-select v-model:value="budgetFilterType" size="small" class="budget-select">
                      <a-select-option value="all">{{ t('result.budget.filterAll') }}</a-select-option>
                      <a-select-option value="attraction">{{ t('result.budget.attraction') }}</a-select-option>
                      <a-select-option value="hotel">{{ t('result.budget.hotel') }}</a-select-option>
                      <a-select-option value="meal">{{ t('result.budget.meal') }}</a-select-option>
                      <a-select-option value="transport">{{ t('result.budget.transport') }}</a-select-option>
                    </a-select>
                  </div>
                  <div class="budget-toolbar-item">
                    <span class="budget-toolbar-label">{{ t('result.budget.sortLabel') }}</span>
                    <a-select v-model:value="budgetSortMode" size="small" class="budget-select">
                      <a-select-option value="amountDesc">{{ t('result.budget.sortAmountDesc') }}</a-select-option>
                      <a-select-option value="amountAsc">{{ t('result.budget.sortAmountAsc') }}</a-select-option>
                      <a-select-option value="dayAsc">{{ t('result.budget.sortDayAsc') }}</a-select-option>
                      <a-select-option value="dayDesc">{{ t('result.budget.sortDayDesc') }}</a-select-option>
                    </a-select>
                  </div>
                </div>

                <div v-if="filteredBudgetItems.length > 0" class="budget-detail-list">
                  <div class="budget-detail-row budget-detail-header">
                    <span>{{ t('result.budget.detailType') }}</span>
                    <span>{{ t('result.budget.detailDay') }}</span>
                    <span>{{ t('result.budget.detailName') }}</span>
                    <span>{{ t('result.budget.detailAmount') }}</span>
                    <span>{{ t('result.budget.detailAction') }}</span>
                  </div>
                  <div
                    v-for="item in filteredBudgetItems"
                    :key="item.id"
                    class="budget-detail-row"
                  >
                    <span class="budget-detail-type">{{ getBudgetTypeLabel(item.type) }}</span>
                    <span class="budget-detail-day">
                      {{ item.dayNumber ? t('common.dayNumber', { day: item.dayNumber }) : '--' }}
                    </span>
                    <span class="budget-detail-name">{{ item.name }}</span>
                    <span class="budget-detail-amount">¥{{ formatBudgetAmount(item.amount) }}</span>
                    <span class="budget-action-wrap">
                      <button
                        type="button"
                        class="budget-icon-btn budget-edit-btn"
                        :title="t('result.budget.editPrice')"
                        @click="editBudgetItemAmount(item)"
                      >
                        <svg fill="currentColor" width="20px" height="20px" viewBox="0 0 256.00098 256.00098" id="Flat" xmlns="http://www.w3.org/2000/svg">
                          <path d="M216.001,203.833h-76l27.91015-27.90967.00684-.00635.00635-.00683,56.563-56.5625a28.03348,28.03348,0,0,0-.001-39.59766L179.23145,34.49512a28.03347,28.03347,0,0,0-39.59766,0L83.07471,91.0542l-.01026.00928-.00927.01025L26.49609,147.63281a28.03171,28.03171,0,0,0,0,39.59766L63.585,224.31836a12.00286,12.00286,0,0,0,8.48535,3.51465H216.001a12,12,0,0,0,0-24ZM156.60449,51.46582a4.00207,4.00207,0,0,1,5.65625,0L207.51562,96.7207a4.005,4.005,0,0,1,0,5.65723l-48.083,48.083L108.521,99.54932ZM106.05957,203.833H77.041L43.4668,170.25977a4.00385,4.00385,0,0,1,0-5.65625L91.55029,116.52l50.91114,50.91113Z"/>
                        </svg>
                      </button>
                      <button
                        type="button"
                        class="budget-icon-btn budget-delete-btn"
                        :title="t('common.delete')"
                        @click="deleteBudgetItem(item)"
                      >
                        <svg fill="currentColor" width="21px" height="21px" viewBox="0 0 256 256" id="Flat" xmlns="http://www.w3.org/2000/svg">
                          <path d="M215.99609,48H180V36A28.03146,28.03146,0,0,0,152,8H104A28.03146,28.03146,0,0,0,76,36V48H39.99609a12,12,0,0,0,0,24h4V208a20.0226,20.0226,0,0,0,20,20h128a20.0226,20.0226,0,0,0,20-20V72h4a12,12,0,0,0,0-24ZM100,36a4.00458,4.00458,0,0,1,4-4h48a4.00458,4.00458,0,0,1,4,4V48H100Zm87.99609,168h-120V72h120ZM116,104v64a12,12,0,0,1-24,0V104a12,12,0,0,1,24,0Zm48,0v64a12,12,0,0,1-24,0V104a12,12,0,0,1,24,0Z"/>
                        </svg>
                      </button>
                    </span>
                  </div>
                </div>
                <a-empty v-else :description="t('result.budget.noDetails')" />
              </div>
            </a-card>
          </div>

          <div class="right-budget-summary" v-show="activeSection === 'budget' && !!tripPlan.budget">
            <div class="budget-summary-panel">
              <div class="budget-summary-title">{{ t('result.budget.title') }}</div>
              <div class="budget-summary-total-wrap">
                <span class="budget-summary-currency">¥</span>
                <span class="budget-summary-total-value">{{ formatBudgetAmount(tripPlan.budget?.total ?? 0) }}</span>
              </div>
              <div class="budget-summary-sub-grid">
                <div class="budget-summary-sub-item">
                  <div class="budget-summary-sub-value">¥{{ formatBudgetAmount(tripPlan.budget?.total_attractions ?? 0) }}</div>
                  <div class="budget-summary-sub-label">{{ t('result.budget.attraction') }}</div>
                </div>
                <div class="budget-summary-sub-item">
                  <div class="budget-summary-sub-value">¥{{ formatBudgetAmount(tripPlan.budget?.total_hotels ?? 0) }}</div>
                  <div class="budget-summary-sub-label">{{ t('result.budget.hotel') }}</div>
                </div>
                <div class="budget-summary-sub-item">
                  <div class="budget-summary-sub-value">¥{{ formatBudgetAmount(tripPlan.budget?.total_meals ?? 0) }}</div>
                  <div class="budget-summary-sub-label">{{ t('result.budget.meal') }}</div>
                </div>
                <div class="budget-summary-sub-item">
                  <div class="budget-summary-sub-value">¥{{ formatBudgetAmount(tripPlan.budget?.total_transportation ?? 0) }}</div>
                  <div class="budget-summary-sub-label">{{ t('result.budget.transport') }}</div>
                </div>
                <div v-if="tripPlan.budget?.total_inter_city_transport" class="budget-summary-sub-item">
                  <div class="budget-summary-sub-value">¥{{ formatBudgetAmount(tripPlan.budget.total_inter_city_transport) }}</div>
                  <div class="budget-summary-sub-label">{{ t('result.interCityTransport') }}</div>
                </div>
              </div>

              <div class="budget-pending-wrap">
                <div class="budget-pending-title">{{ t('result.budget.pendingTitle') }}</div>
                <div v-if="pendingBudgetItems.length === 0" class="budget-pending-empty">
                  {{ t('result.budget.pendingEmpty') }}
                </div>
                <div v-else class="budget-pending-list">
                  <div
                    v-for="pendingItem in pendingBudgetItems"
                    :key="pendingItem.uid"
                    class="budget-pending-item"
                  >
                    <span class="budget-pending-name">{{ pendingItem.base.name }}</span>
                    <a-button
                      type="link"
                      size="small"
                      class="budget-restore-btn"
                      @click="restoreBudgetItem(pendingItem)"
                    >
                      {{ t('result.budget.restore') }}
                    </a-button>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <div class="right-map" v-show="activeSection === 'map'">
            <a-card id="map" :bordered="false" class="map-card section-shellless">
              <button
                v-if="mapProviderType === 'amap'"
                type="button"
                class="map-labels-toggle"
                :class="{ on: mapLabelsShown }"
                @click="toggleMapLabels"
              >
                {{ mapLabelsShown ? t('result.roadbook.mapHideLabels') : t('result.roadbook.mapShowLabels') }}
              </button>
              <div v-show="mapProviderType === 'google'" id="google-map-container" style="width: 100%; height: 100%"></div>
              <div v-show="mapProviderType === 'amap'" id="amap-container" style="width: 100%; height: 100%"></div>
            </a-card>
          </div>
        </div>

        <!-- 知识图谱 -->
        <a-card v-show="activeSection === 'knowledge-graph'" id="knowledge-graph" :bordered="false" class="kg-card section-shellless">
          <div id="kg-chart-container" style="width: 100%; height: 600px;"></div>
          <div class="kg-legend">
            <span v-for="cat in graphCategories" :key="cat.name" class="kg-legend-item">
              <span class="kg-legend-dot" :style="getKgLegendDotStyle(cat.name)"></span>
              {{ getCategoryLabel(cat.name) }}
            </span>
          </div>
        </a-card>

        <!-- 每日行程:可折叠 -->
        <a-card v-show="activeSection === 'days'" :bordered="false" class="days-card section-shellless">
          <a-collapse v-model:activeKey="activeDays" accordion>
            <a-collapse-panel
              v-for="(day, dayIdx) in tripPlan.days"
              :key="dayIdx"
              :id="`day-${dayIdx}`"
            >
              <template #header>
                <div class="day-header">
                  <span class="day-title">{{ t('common.dayNumber', { day: dayIdx + 1 }) }}</span>
                  <span v-if="day.city" class="day-city-tag">{{ day.city }}</span>
                  <span v-if="day.is_transfer_day" class="day-transfer-tag">{{ t('result.transferDay') }}</span>
                  <span class="day-date">{{ day.date }}</span>
                </div>
              </template>

              <!-- 城际移动信息 -->
              <div v-if="day.is_transfer_day && day.transfer_info" class="transfer-info-banner">
                <span class="transfer-info-icon">🚄</span>
                <span class="transfer-info-label">{{ t('result.transferInfo') }}:</span>
                <span class="transfer-info-text">{{ day.transfer_info }}</span>
              </div>

              <!-- 行程基本信息（编辑模式下可修改） -->
              <div class="day-info">
                <div class="info-row">
                  <span class="label">{{ t('result.dayDescription') }}</span>
                  <a-textarea v-if="editMode" v-model:value="day.description" :auto-size="{ minRows: 2, maxRows: 5 }" size="small" />
                  <span v-else class="value">{{ day.description }}</span>
                </div>
                <div class="info-row">
                  <span class="label">{{ t('result.dayTransport') }}</span>
                  <a-textarea v-if="editMode" v-model:value="day.transportation" :auto-size="{ minRows: 1, maxRows: 3 }" size="small" />
                  <span v-else class="value">{{ day.transportation }}</span>
                </div>
                <div class="info-row">
                  <span class="label">{{ t('result.dayAccommodation') }}</span>
                  <a-textarea v-if="editMode" v-model:value="day.accommodation" :auto-size="{ minRows: 1, maxRows: 3 }" size="small" />
                  <span v-else class="value">{{ day.accommodation }}</span>
                </div>
              </div>

              <!-- 景点安排 -->
              <a-divider orientation="left">{{ t('result.attractionTitle') }}</a-divider>
              <a-list
                :data-source="day.attractions"
                :grid="{ gutter: 16, column: 2 }"
              >
                <template #renderItem="{ item, index }">
                  <a-list-item>
                    <a-card :title="item.name" size="small" class="attraction-card">
                      <!-- 编辑模式下的操作按钮（dayIdx=天数组下标，index=景点下标） -->
                      <template #extra v-if="editMode">
                        <a-space>
                          <a-button
                            size="small"
                            @click="moveAttraction(dayIdx, index, 'up')"
                            :disabled="index === 0"
                          >
                            Up
                          </a-button>
                          <a-button
                            size="small"
                            @click="moveAttraction(dayIdx, index, 'down')"
                            :disabled="index === day.attractions.length - 1"
                          >
                            Down
                          </a-button>
                          <a-button
                            size="small"
                            @click="openMoveModal(dayIdx, index)"
                            :disabled="tripPlan.days.length < 2"
                          >
                            {{ t('result.moveToDay') }}
                          </a-button>
                          <a-button
                            size="small"
                            danger
                            @click="deleteAttraction(dayIdx, index)"
                          >
                            {{ t('common.delete') }}
                          </a-button>
                        </a-space>
                      </template>

                      <!-- 景点图片 -->
                      <div class="attraction-image-wrapper">
                        <img
                          :src="toProxiedPhotoUrl(item.image_url) || getAttractionImage(item.name, index)"
                          :alt="item.name"
                          class="attraction-image"
                          @error="handleImageError"
                        />
                        <div class="attraction-badge">
                          <span class="badge-number">{{ index + 1 }}</span>
                        </div>
                        <div v-if="item.ticket_price" class="price-tag">
                          ¥{{ item.ticket_price }}
                        </div>
                        <div v-else-if="item.ticket_price === 0" class="price-tag price-tag-free">
                          {{ t('result.ticketFree') }}
                        </div>
                      </div>

                      <!-- 编辑模式下可编辑的字段（与手动添加景点表单同款属性） -->
                      <div v-if="editMode">
                        <p><strong>{{ t('result.fieldName') }}:</strong></p>
                        <a-input v-model:value="item.name" size="small" style="margin-bottom: 8px" />

                        <p><strong>{{ t('result.fieldAddress') }}:</strong></p>
                        <a-input v-model:value="item.address" size="small" style="margin-bottom: 8px" />

                        <p><strong>{{ t('result.fieldVisitDurationMinutes') }}:</strong></p>
                        <a-input-number v-model:value="item.visit_duration" :min="10" :max="480" size="small" style="width: 100%; margin-bottom: 8px" />

                        <p><strong>{{ t('result.fieldTicketType') }}:</strong></p>
                        <a-radio-group
                          size="small"
                          button-style="solid"
                          :value="item.ticket_price ? 'paid' : 'free'"
                          style="margin-bottom: 8px"
                          @change="(e: any) => setTicketMode(item, e.target.value)"
                        >
                          <a-radio-button value="free">{{ t('result.ticketFree') }}</a-radio-button>
                          <a-radio-button value="paid">{{ t('result.fieldTicketPaid') }}</a-radio-button>
                        </a-radio-group>
                        <a-input-number
                          v-if="item.ticket_price"
                          v-model:value="item.ticket_price"
                          :min="1"
                          size="small"
                          style="width: 100%; margin-bottom: 8px"
                          :placeholder="t('result.fieldTicketPrice')"
                        />

                        <p><strong>{{ t('result.fieldReservationRequired') }}:</strong></p>
                        <a-switch
                          size="small"
                          :checked="!!item.reservation_required"
                          style="margin-bottom: 8px"
                          @change="(v: any) => setReservation(item, v)"
                        />
                        <a-input
                          v-if="item.reservation_required"
                          v-model:value="item.reservation_tips"
                          size="small"
                          :placeholder="t('result.fieldReservationTipsPlaceholder')"
                          style="margin-bottom: 8px"
                        />

                        <p><strong>{{ t('result.fieldDescription') }}:</strong></p>
                        <a-textarea v-model:value="item.description" :rows="2" size="small" style="margin-bottom: 8px" />

                        <!-- 到下一景点的交通段（当天最后一个景点不显示） -->
                        <template v-if="index < day.attractions.length - 1">
                          <p><strong>🚇 {{ t('result.transferToNext') }}:</strong></p>
                          <a-input
                            v-model:value="item.transfer_to_next"
                            size="small"
                            :placeholder="t('result.transferToNextPlaceholder')"
                            style="margin-bottom: 8px"
                          />
                        </template>
                      </div>

                      <!-- 查看模式 -->
                      <div v-else>
                        <p><strong>{{ t('result.fieldAddress') }}:</strong> {{ item.address }}</p>
                        <p><strong>{{ t('result.fieldVisitDuration') }}:</strong> {{ item.visit_duration }}{{ t('result.minuteUnit') }}</p>
                        <p><strong>{{ t('result.fieldDescription') }}:</strong> {{ item.description }}</p>
                        <p v-if="item.rating"><strong>{{ t('result.fieldRating') }}:</strong> {{ item.rating }}</p>
                        <!-- 预约提醒 -->
                        <div v-if="item.reservation_required" class="reservation-alert">
                          <span class="reservation-badge">📋 需提前预约</span>
                          <span v-if="item.reservation_tips" class="reservation-tips">{{ item.reservation_tips }}</span>
                        </div>
                        <!-- 到下一景点的交通段 -->
                        <div v-if="item.transfer_to_next" class="transfer-leg-view">
                          🚇 {{ t('result.transferToNext') }}：{{ item.transfer_to_next }}
                        </div>
                      </div>
                    </a-card>
                  </a-list-item>
                </template>
              </a-list>

              <!-- 新增景点（编辑模式） -->
              <a-button
                v-if="editMode"
                type="dashed"
                block
                class="add-attraction-btn"
                @click="openAddAttractionModal(dayIdx)"
              >
                + {{ t('result.addAttraction') }}
              </a-button>

              <!-- 酒店推荐（编辑模式下可增删改，费用自动计入预算） -->
              <a-divider v-if="day.hotel || editMode" orientation="left">{{ t('result.hotelTitle') }}</a-divider>
              <a-card v-if="day.hotel" size="small" class="hotel-card">
                <template #title>
                  <a-input v-if="editMode" v-model:value="day.hotel.name" size="small" style="width: 70%" :placeholder="t('result.fieldName')" />
                  <span v-else class="hotel-title">{{ day.hotel.name }}</span>
                </template>
                <template #extra>
                  <a-button v-if="editMode" size="small" danger @click="deleteHotel(dayIdx)">
                    {{ t('common.delete') }}
                  </a-button>
                </template>
                <a-descriptions v-if="!editMode" :column="2" size="small">
                  <a-descriptions-item :label="t('result.fieldAddress')">{{ day.hotel.address }}</a-descriptions-item>
                  <a-descriptions-item :label="t('result.fieldType')">{{ day.hotel.type }}</a-descriptions-item>
                  <a-descriptions-item :label="t('result.fieldPriceRange')">{{ day.hotel.price_range }}</a-descriptions-item>
                  <a-descriptions-item :label="t('result.fieldRating')">{{ day.hotel.rating }}</a-descriptions-item>
                  <a-descriptions-item :label="t('result.fieldDistance')" :span="2">{{ day.hotel.distance }}</a-descriptions-item>
                </a-descriptions>
                <div v-else class="hotel-edit-grid">
                  <a-input v-model:value="day.hotel.address" size="small" :placeholder="t('result.fieldAddress')" />
                  <a-input v-model:value="day.hotel.type" size="small" :placeholder="t('result.fieldType')" />
                  <a-input v-model:value="day.hotel.price_range" size="small" :placeholder="t('result.fieldPriceRange')" />
                  <a-input v-model:value="day.hotel.rating" size="small" :placeholder="t('result.fieldRating')" />
                  <a-input v-model:value="day.hotel.distance" size="small" :placeholder="t('result.fieldDistance')" />
                  <a-input-number v-model:value="day.hotel.estimated_cost" size="small" :min="0" style="width: 100%" :placeholder="t('result.fieldPerNightCost')" />
                </div>
              </a-card>
              <a-button
                v-if="!day.hotel && editMode"
                type="dashed"
                block
                class="add-attraction-btn"
                @click="openHotelModal(dayIdx)"
              >
                + {{ t('result.addHotel') }}
              </a-button>

              <!-- 餐饮安排（编辑模式下可增删改，含定位与关联景点） -->
              <a-divider orientation="left">{{ t('result.mealsTitle') }}</a-divider>
              <a-descriptions v-if="!editMode" :column="1" bordered size="small">
                <a-descriptions-item
                  v-for="(meal, mealIdx) in day.meals"
                  :key="mealIdx"
                  :label="getMealLabel(meal.type)"
                >
                  {{ meal.name }}
                  <span v-if="meal.description"> - {{ meal.description }}</span>
                  <a-tag v-if="meal.related_attraction" color="blue" style="margin-left: 6px">
                    📍 {{ meal.related_attraction }}
                  </a-tag>
                </a-descriptions-item>
              </a-descriptions>
              <div v-else class="meal-edit-list">
                <div v-for="(meal, mealIdx) in day.meals" :key="mealIdx" class="meal-edit-row">
                  <a-select v-model:value="meal.type" size="small" style="width: 88px" :options="mealTypeOptions" />
                  <a-input v-model:value="meal.name" size="small" style="flex: 2; min-width: 120px" :placeholder="t('result.fieldName')" />
                  <a-input-number v-model:value="meal.estimated_cost" size="small" :min="0" style="width: 96px" :placeholder="t('result.fieldPerPersonCost')" />
                  <a-select
                    v-model:value="meal.related_attraction"
                    size="small"
                    style="flex: 1.4; min-width: 110px"
                    allow-clear
                    :placeholder="t('result.fieldRelatedAttractionNone')"
                    :options="day.attractions.map((a) => ({ value: a.name, label: a.name }))"
                  />
                  <a-input v-model:value="meal.address" size="small" style="flex: 2; min-width: 120px" :placeholder="t('result.fieldAddress')" />
                  <a-input v-model:value="meal.description" size="small" style="flex: 2; min-width: 120px" :placeholder="t('result.fieldDescription')" />
                  <a-button size="small" danger @click="deleteMeal(dayIdx, mealIdx)">
                    {{ t('common.delete') }}
                  </a-button>
                </div>
                <a-button type="dashed" block class="add-attraction-btn" @click="openMealModal(dayIdx)">
                  + {{ t('result.addMeal') }}
                </a-button>
              </div>
            </a-collapse-panel>
          </a-collapse>
        </a-card>

        <a-card
          v-show="activeSection === 'weather' && tripPlan.weather_info && tripPlan.weather_info.length > 0"
          id="weather"
          v-if="tripPlan.weather_info && tripPlan.weather_info.length > 0"
          :bordered="false"
          class="section-shellless weather-section-card"
        >
          <div v-if="selectedWeather" class="weather-dashboard">
            <section class="weather-side" :style="weatherSideStyle">
              <div class="weather-gradient"></div>

              <div class="date-container">
                <h2 class="date-dayname">{{ formatWeatherWeekday(selectedWeather.date) }}</h2>
                <span class="date-day">{{ formatWeatherDate(selectedWeather.date) }}</span>
                <span class="location">
                  <span class="location-icon">
                    <svg width="16px" height="16px" viewBox="-3 0 20 20" version="1.1" xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink">
                        <g id="Page-1" stroke="none" stroke-width="1" fill="none" fill-rule="evenodd">
                            <g id="Dribbble-Light-Preview" transform="translate(-223.000000, -5439.000000)" fill="currentColor">
                                <g id="icons" transform="translate(56.000000, 160.000000)">
                                    <path d="M176,5286.219 C176,5287.324 175.105,5288.219 174,5288.219 C172.895,5288.219 172,5287.324 172,5286.219 C172,5285.114 172.895,5284.219 174,5284.219 C175.105,5284.219 176,5285.114 176,5286.219 M174,5296 C174,5296 169,5289 169,5286 C169,5283.243 171.243,5281 174,5281 C176.757,5281 179,5283.243 179,5286 C179,5289 174,5296 174,5296 M174,5279 C170.134,5279 167,5282.134 167,5286 C167,5289.866 174,5299 174,5299 C174,5299 181,5289.866 181,5286 C181,5282.134 177.866,5279 174,5279" id="pin_sharp_circle-[#624]"></path>
                                </g>
                            </g>
                        </g>
                    </svg>
                  </span>
                  {{ selectedWeather?.city || tripPlan.city }}
                </span>
              </div>

              <div class="weather-container">
                <div class="weather-hero-icon weather-icon" :class="selectedWeatherIconKind">
                  <template v-if="selectedWeatherIconKind === 'sun-shower'">
                    <div class="cloud"></div>
                    <div class="sun">
                      <div class="rays"></div>
                    </div>
                    <div class="rain"></div>
                  </template>
                  <template v-else-if="selectedWeatherIconKind === 'thunder-storm'">
                    <div class="cloud"></div>
                    <div class="lightning">
                      <div class="bolt"></div>
                      <div class="bolt"></div>
                    </div>
                  </template>
                  <template v-else-if="selectedWeatherIconKind === 'cloudy'">
                    <div class="cloud"></div>
                    <div class="cloud"></div>
                  </template>
                  <template v-else-if="selectedWeatherIconKind === 'flurries'">
                    <div class="cloud"></div>
                    <div class="snow">
                      <div class="flake"></div>
                      <div class="flake"></div>
                    </div>
                  </template>
                  <template v-else-if="selectedWeatherIconKind === 'rainy'">
                    <div class="cloud"></div>
                    <div class="rain"></div>
                  </template>
                  <template v-else>
                    <div class="sun">
                      <div class="rays"></div>
                    </div>
                  </template>
                </div>
                <h1 class="weather-temp">{{ formatWeatherTemp(selectedWeather.day_temp) }}</h1>
                <h3 class="weather-desc">{{ selectedWeather.day_weather }}</h3>
              </div>
            </section>

            <section class="weather-info-side">
              <div class="week-container week-container--top">
                <ul class="week-list">
                  <li
                    v-for="(weatherItem, weatherIndex) in weatherDisplayList"
                    :key="`${weatherItem.date}-${weatherIndex}`"
                    :class="{ active: weatherIndex === activeWeatherIndex }"
                    @mouseenter="selectWeatherDay(weatherIndex)"
                    @click="selectWeatherDay(weatherIndex)"
                  >
                    <div class="day-icon weather-icon weather-icon--small" :class="weatherItem._iconKind">
                      <template v-if="weatherItem._iconKind === 'sun-shower'">
                        <div class="cloud"></div>
                        <div class="sun">
                          <div class="rays"></div>
                        </div>
                        <div class="rain"></div>
                      </template>
                      <template v-else-if="weatherItem._iconKind === 'thunder-storm'">
                        <div class="cloud"></div>
                        <div class="lightning">
                          <div class="bolt"></div>
                          <div class="bolt"></div>
                        </div>
                      </template>
                      <template v-else-if="weatherItem._iconKind === 'cloudy'">
                        <div class="cloud"></div>
                        <div class="cloud"></div>
                      </template>
                      <template v-else-if="weatherItem._iconKind === 'flurries'">
                        <div class="cloud"></div>
                        <div class="snow">
                          <div class="flake"></div>
                          <div class="flake"></div>
                        </div>
                      </template>
                      <template v-else-if="weatherItem._iconKind === 'rainy'">
                        <div class="cloud"></div>
                        <div class="rain"></div>
                      </template>
                      <template v-else>
                        <div class="sun">
                          <div class="rays"></div>
                        </div>
                      </template>
                    </div>
                    <span class="day-name">{{ formatWeatherWeekday(weatherItem.date, true) }}</span>
                    <span class="day-temp">{{ formatWeatherTemp(weatherItem.day_temp) }}</span>
                  </li>
                </ul>
              </div>

              <div class="today-info-container">
                <div class="today-info">
                  <div class="today-info-item">
                    <span class="wea-title">{{ t('result.weatherDay') }}</span>
                    <span class="value">{{ selectedWeather.day_weather }} · {{ formatWeatherTemp(selectedWeather.day_temp) }}</span>
                  </div>
                  <div class="today-info-item">
                    <span class="wea-title">{{ t('result.weatherNight') }}</span>
                    <span class="value">{{ selectedWeather.night_weather }} · {{ formatWeatherTemp(selectedWeather.night_temp) }}</span>
                  </div>
                  <div class="today-info-item">
                    <span class="wea-title">{{ t('result.weatherPrecipitation') }}</span>
                    <span class="value">{{ getWeatherPrecipitation(selectedWeather.day_weather) }}</span>
                  </div>
                  <div class="today-info-item">
                    <span class="wea-title">{{ t('result.weatherHumidity') }}</span>
                    <span class="value">{{ getWeatherHumidity(selectedWeather.day_weather) }}</span>
                  </div>
                  <div class="today-info-item">
                    <span class="wea-title">{{ t('result.weatherWind') }}</span>
                    <span class="value">{{ getWeatherWind(selectedWeather) }}</span>
                  </div>
                </div>
              </div>
            </section>
          </div>
        </a-card>
      </div>

      <div v-else class="empty-state-panel">
        <a-empty :description="t('result.noTripPlan')">
          <template #description>
            <span class="empty-desc">{{ t('result.noTripPlanDesc') }}</span>
          </template>
          <a-button class="empty-back-btn" type="primary" @click="goBack">{{ t('result.backCreateTrip') }}</a-button>
        </a-empty>
      </div>
    </main>

    <!-- 回到顶部按钮 -->
    <a-back-top :visibility-height="300">
      <div class="back-top-button">
        Top
      </div>
    </a-back-top>

    <!-- 新增景点弹窗 -->
    <a-modal
      v-model:open="addAttractionVisible"
      :title="t('result.addAttraction')"
      :footer="null"
      width="560px"
    >
      <a-tabs v-model:activeKey="addAttractionTab">
        <a-tab-pane key="search" :tab="t('result.addBySearch')">
          <a-input-search
            v-model:value="poiSearchKeyword"
            :placeholder="t('result.poiSearchPlaceholder')"
            :loading="poiSearching"
            :enter-button="t('result.poiSearchButton')"
            @search="doSearchPoi"
          />
          <div class="poi-result-list">
            <a-empty v-if="!poiSearchResults.length && !poiSearching" :image-style="{ height: '48px' }" :description="t('result.poiSearchEmpty')" />
            <div
              v-for="poi in poiSearchResults"
              :key="poi.id || poi.name"
              class="poi-result-item"
              @click="pickSearchResult(poi)"
            >
              <div class="poi-name">{{ poi.name }}</div>
              <div class="poi-sub">{{ poi.address }}</div>
              <div class="poi-sub poi-type">{{ poi.type }}</div>
            </div>
          </div>
        </a-tab-pane>
        <a-tab-pane key="manual" :tab="t('result.addManually')">
          <a-form layout="vertical">
            <a-form-item :label="t('result.fieldName')" required>
              <a-input v-model:value="manualAttraction.name" />
            </a-form-item>
            <a-form-item :label="t('result.fieldAddress')">
              <a-input v-model:value="manualAttraction.address" />
            </a-form-item>
            <a-form-item :label="t('result.fieldVisitDurationMinutes')">
              <a-input-number v-model:value="manualAttraction.visit_duration" :min="10" :max="480" style="width: 100%" />
            </a-form-item>
            <a-form-item :label="t('result.fieldTicketType')">
              <a-radio-group v-model:value="manualAttraction.ticket_free" button-style="solid">
                <a-radio-button :value="true">{{ t('result.ticketFree') }}</a-radio-button>
                <a-radio-button :value="false">{{ t('result.fieldTicketPaid') }}</a-radio-button>
              </a-radio-group>
              <a-input-number
                v-if="!manualAttraction.ticket_free"
                v-model:value="manualAttraction.ticket_price"
                :min="0"
                style="width: 100%; margin-top: 8px"
                :placeholder="t('result.fieldTicketPrice')"
              />
            </a-form-item>
            <a-form-item :label="t('result.fieldReservationRequired')">
              <a-switch v-model:checked="manualAttraction.reservation_required" />
              <a-input
                v-if="manualAttraction.reservation_required"
                v-model:value="manualAttraction.reservation_tips"
                style="margin-top: 8px"
                :placeholder="t('result.fieldReservationTipsPlaceholder')"
              />
            </a-form-item>
            <a-form-item :label="t('result.fieldDescription')">
              <a-textarea v-model:value="manualAttraction.description" :rows="2" />
            </a-form-item>
            <a-button type="primary" block @click="submitManualAttraction">
              {{ t('result.confirmAdd') }}
            </a-button>
          </a-form>
        </a-tab-pane>
      </a-tabs>
    </a-modal>

    <!-- 新增餐饮弹窗 -->
    <MealAddModal
      v-model:open="mealModalVisible"
      :city="mealModalCity"
      :attractions="mealModalAttractions"
      @add="onMealAdd"
    />

    <!-- 新增住宿弹窗 -->
    <HotelAddModal
      v-model:open="hotelModalVisible"
      :city="hotelModalCity"
      @add="onHotelAdd"
    />

    <!-- 移动景点到其他天弹窗 -->
    <a-modal
      v-model:open="moveAttractionVisible"
      :title="t('result.moveToDay')"
      :ok-text="t('result.confirmMove')"
      :ok-button-props="{ disabled: moveTargetDay === null }"
      @ok="confirmMoveToDay"
    >
      <p class="move-modal-hint">{{ t('result.moveToDayHint', { name: movingAttractionName }) }}</p>
      <a-select
        v-model:value="moveTargetDay"
        style="width: 100%"
        :placeholder="t('result.moveToDayPlaceholder')"
        :options="moveDayOptions"
      />
    </a-modal>

    <AIChat :trip-plan="tripPlan" />
  </div>
</template>

<script setup lang="ts">
import { computed, ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { useI18n } from 'vue-i18n'
import { message } from 'ant-design-vue'
import AMapLoader from '@amap/amap-jsapi-loader'
import { Loader as GoogleMapsLoader } from '@googlemaps/js-api-loader'
import * as echarts from 'echarts'
import Swiper from 'swiper'
import { EffectCoverflow, Keyboard, Mousewheel } from 'swiper/modules'
import NavBar from '@/components/NavBar.vue'
import OverviewAttractionCard from '@/components/OverviewAttractionCard.vue'
import AIChat from '@/components/AIChat.vue'
import MealAddModal from '@/components/MealAddModal.vue'
import HotelAddModal from '@/components/HotelAddModal.vue'
import type { TripPlan, TripPlanResponse, KnowledgeGraphData, GraphCategory, Attraction, Meal, Hotel, WeatherInfo, POISearchItem } from '@/types'
import {
  getRuntimeApiBaseUrl,
  getRuntimeMapJsKey,
  getRuntimeGoogleMapsApiKey,
  setRuntimeGoogleMapsApiKey,
  getBackendRuntimeSettings,
  pollTaskStatus,
  saveTripPlan,
  searchPoi,
  RUNTIME_SETTINGS_UPDATED_EVENT,
} from '@/services/api'
import { collectMapPoints, exportRoadbook, exportRoadbookMarkdown } from '@/utils/roadbook'

const router = useRouter()
const route = useRoute()
const { t, locale } = useI18n()
const tripPlan = ref<TripPlan | null>(null)
const planId = ref('')
const editMode = ref(false)
const originalPlan = ref<TripPlan | null>(null)
const exportingRoadbook = ref(false)
// 新增景点弹窗
const addAttractionVisible = ref(false)
const addAttractionTab = ref<'search' | 'manual'>('search')
const addAttractionTargetDay = ref<number | null>(null)
const poiSearchKeyword = ref('')
const poiSearchResults = ref<POISearchItem[]>([])
const poiSearching = ref(false)
const manualAttraction = ref<{
  name: string
  address: string
  visit_duration: number
  description: string
  location: { longitude: number; latitude: number } | null
  poi_id: string
  ticket_free: boolean
  ticket_price: number
  reservation_required: boolean
  reservation_tips: string
}>({
  name: '',
  address: '',
  visit_duration: 90,
  description: '',
  location: null,
  poi_id: '',
  ticket_free: true,
  ticket_price: 0,
  reservation_required: false,
  reservation_tips: '',
})
// 跨天移动弹窗
const moveAttractionVisible = ref(false)
const moveSourceDay = ref<number | null>(null)
const moveSourceIndex = ref<number | null>(null)
const moveTargetDay = ref<number | null>(null)
const movingAttractionName = ref('')
// 新增餐饮弹窗
const mealModalVisible = ref(false)
const mealModalDayIndex = ref<number | null>(null)
// 新增住宿弹窗
const hotelModalVisible = ref(false)
const hotelModalDayIndex = ref<number | null>(null)
const attractionPhotos = ref<Record<string, string>>({})
const activeSection = ref('overview')
const activeDays = ref<number[]>([0]) // 默认展开第一天
const activeOverviewCard = ref(1)
const overviewSwiperContainerRef = ref<HTMLElement | null>(null)
const mapRefreshing = ref(false)
let map: any = null
// 路书同款地图：全部名称标签覆盖物与开关状态
let mapLabelOverlays: any[] = []
const mapLabelsShown = ref(false)
let googleMap: google.maps.Map | null = null
let googleMarkers: google.maps.Marker[] = []
let googlePolylines: google.maps.Polyline[] = []
let googleInfoWindows: google.maps.InfoWindow[] = []
let googleDirectionsRenderers: google.maps.DirectionsRenderer[] = []
const mapProviderType = ref<'google' | 'amap'>('amap')
let overviewSwiper: Swiper | null = null
let mapInitGeneration = 0

type OverviewAttractionItem = {
  name: string
  address: string
  visit_duration: number
  description: string
  ticket_price?: number
  dayNumber: number
  dayArrayIndex: number
  order: number
}

type BudgetItemType = 'attraction' | 'hotel' | 'meal' | 'transport'
type BudgetSortMode = 'amountDesc' | 'amountAsc' | 'dayAsc' | 'dayDesc'

type BudgetDetailItem = {
  id: string
  type: BudgetItemType
  dayIndex: number | null
  dayNumber: number | null
  name: string
  amount: number
  sourceIndex?: number
}

type BudgetRestorePayload =
  | {
      type: 'attraction'
      attraction: Attraction
      insertIndex: number
    }
  | {
      type: 'meal'
      meal: Meal
      insertIndex: number
    }
  | {
      type: 'hotel'
      hotel: Hotel
      accommodation: string
    }
  | {
      type: 'transport'
      transportation: string
    }

type BudgetRestoreItem = {
  uid: string
  base: BudgetDetailItem
  payload: BudgetRestorePayload
}

const budgetFilterType = ref<'all' | BudgetItemType>('all')
const budgetSortMode = ref<BudgetSortMode>('amountDesc')
const pendingBudgetItems = ref<BudgetRestoreItem[]>([])
const activeWeatherIndex = ref(0)

const localeTag = computed(() => {
  const currentLocale = String(locale.value || 'en').toLowerCase()
  if (currentLocale.startsWith('zh')) return 'zh-CN'
  if (currentLocale.startsWith('ja')) return 'ja-JP'
  return 'en-US'
})

const weatherList = computed<WeatherInfo[]>(() => tripPlan.value?.weather_info ?? [])

const selectedWeather = computed<WeatherInfo | null>(() => {
  const list = weatherList.value
  if (list.length === 0) return null
  const safeIndex = Math.min(Math.max(activeWeatherIndex.value, 0), list.length - 1)
  return list[safeIndex]
})

const parseWeatherDate = (rawDate: string): Date | null => {
  if (!rawDate) return null

  const normalized = rawDate
    .replace(/年/g, '-')
    .replace(/月/g, '-')
    .replace(/日/g, '')
    .replace(/[./]/g, '-')
    .trim()

  const parsedDate = new Date(normalized)
  if (!Number.isNaN(parsedDate.getTime())) return parsedDate

  const matched = rawDate.match(/(\d{4})\D+(\d{1,2})\D+(\d{1,2})/)
  if (!matched) return null
  const [, year, month, day] = matched
  const fallbackDate = new Date(Number(year), Number(month) - 1, Number(day))
  return Number.isNaN(fallbackDate.getTime()) ? null : fallbackDate
}

const formatWeatherDate = (rawDate: string): string => {
  const date = parseWeatherDate(rawDate)
  if (!date) return rawDate || '--'
  return new Intl.DateTimeFormat(localeTag.value, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(date)
}

const formatWeatherWeekday = (rawDate: string, short = false): string => {
  const date = parseWeatherDate(rawDate)
  if (!date) return rawDate || '--'
  return new Intl.DateTimeFormat(localeTag.value, {
    weekday: short ? 'short' : 'long',
  }).format(date)
}

const formatWeatherTemp = (temperature: number | null | undefined): string => {
  if (!Number.isFinite(Number(temperature))) return '--'
  return `${Math.round(Number(temperature))}°C`
}

type WeatherIconKind = 'sun-shower' | 'thunder-storm' | 'cloudy' | 'flurries' | 'sunny' | 'rainy'

const getWeatherIconKind = (weatherText: string): WeatherIconKind => {
  const text = (weatherText || '').trim()
  const hasRain = /(雨|rain|shower|drizzle|sprinkle|阵雨|小雨|中雨|大雨|暴雨)/i.test(text)
  const hasSun = /(晴|sun|clear)/i.test(text)

  if (/(雷|thunder|storm|lightning|雷暴|雷阵雨)/i.test(text)) return 'thunder-storm'
  if (/(雪|snow|sleet|hail|冰雹|冻雨|雨夹雪)/i.test(text)) return 'flurries'
  if (hasRain && hasSun) return 'sun-shower'
  if (hasRain) return 'rainy'
  if (/(云|阴|cloud|overcast|雾|霾|fog|mist|haze|wind|breeze|gale)/i.test(text)) return 'cloudy'
  return 'sunny'
}

const selectedWeatherIconKind = computed<WeatherIconKind>(() => {
  if (!selectedWeather.value) return 'sunny'
  return getWeatherIconKind(`${selectedWeather.value.day_weather || ''} ${selectedWeather.value.night_weather || ''}`)
})

type WeatherDisplayItem = WeatherInfo & {
  _iconKind: WeatherIconKind
}

const weatherDisplayList = computed<WeatherDisplayItem[]>(() => {
  return weatherList.value.map((item) => ({
    ...item,
    _iconKind: getWeatherIconKind(`${item.day_weather || ''} ${item.night_weather || ''}`),
  }))
})

const getWeatherGradient = (weatherText: string): string => {
  const text = (weatherText || '').toLowerCase()
  if (/(雷|thunder)/.test(text)) return 'linear-gradient(140deg, #3a4a86 0%, #5b3b8a 100%)'
  if (/(雪|snow|sleet|hail)/.test(text)) return 'linear-gradient(140deg, #8bc6ec 0%, #d9afd9 100%)'
  if (/(雨|rain|shower|drizzle)/.test(text)) return 'linear-gradient(140deg, #4b6cb7 0%, #182848 100%)'
  if (/(雾|霾|fog|mist|haze)/.test(text)) return 'linear-gradient(140deg, #7b8799 0%, #4a5568 100%)'
  if (/(阴|cloud|overcast)/.test(text)) return 'linear-gradient(140deg, #6d7f92 0%, #3f4c6b 100%)'
  return 'linear-gradient(140deg, #72edf2 0%, #5151e5 100%)'
}

const getWeatherPrecipitation = (weatherText: string): string => {
  const text = (weatherText || '').toLowerCase()
  if (/(雷|thunder|暴雨|storm)/.test(text)) return '85%'
  if (/(雨|rain|shower|drizzle)/.test(text)) return '65%'
  if (/(雪|snow|sleet|hail)/.test(text)) return '55%'
  if (/(阴|cloud|overcast)/.test(text)) return '30%'
  return '10%'
}

const getWeatherHumidity = (weatherText: string): string => {
  const text = (weatherText || '').toLowerCase()
  if (/(雷|thunder|暴雨|storm)/.test(text)) return '88%'
  if (/(雨|rain|shower|drizzle)/.test(text)) return '78%'
  if (/(雪|snow|sleet|hail)/.test(text)) return '72%'
  if (/(阴|cloud|overcast|雾|霾|fog|mist|haze)/.test(text)) return '62%'
  return '42%'
}

const getWeatherWind = (weather: WeatherInfo | null): string => {
  if (!weather) return '--'
  const direction = weather.wind_direction?.trim() || '--'
  const power = weather.wind_power?.trim() || '--'
  return `${direction} ${power}`.trim()
}

const selectWeatherDay = (index: number) => {
  if (index < 0 || index >= weatherList.value.length) return
  activeWeatherIndex.value = index
}

const weatherSideStyle = computed<Record<string, string>>(() => ({
  '--weather-gradient': getWeatherGradient(selectedWeather.value?.day_weather || ''),
}))

watch(
  weatherList,
  (list) => {
    if (list.length === 0) {
      activeWeatherIndex.value = 0
      return
    }

    if (activeWeatherIndex.value > list.length - 1) {
      activeWeatherIndex.value = 0
    }
  },
  { immediate: true }
)

const overviewAttractions = computed<OverviewAttractionItem[]>(() => {
  if (!tripPlan.value) return []

  const items: OverviewAttractionItem[] = []
  tripPlan.value.days.forEach((day, dayArrayIndex) => {
    const dayNumber = dayArrayIndex + 1

    day.attractions.forEach((attraction, order) => {
      items.push({
        name: attraction.name,
        address: attraction.address,
        visit_duration: attraction.visit_duration,
        description: attraction.description,
        ticket_price: attraction.ticket_price,
        dayNumber,
        dayArrayIndex,
        order,
      })
    })
  })
  return items
})

const destroyOverviewSwiper = () => {
  if (overviewSwiper) {
    overviewSwiper.destroy(true, true)
    overviewSwiper = null
  }
}

const initOverviewSwiper = async () => {
  await nextTick()

  if (!overviewSwiperContainerRef.value || overviewAttractions.value.length === 0) {
    destroyOverviewSwiper()
    return
  }

  const root = overviewSwiperContainerRef.value.querySelector('.swiper') as HTMLElement | null
  if (!root) return

  destroyOverviewSwiper()
  overviewSwiper = new Swiper(root, {
    modules: [EffectCoverflow, Keyboard, Mousewheel],
    effect: 'coverflow',
    grabCursor: true,
    centeredSlides: true,
    coverflowEffect: {
      rotate: 0,
      stretch: 0,
      depth: 100,
      modifier: 2.5,
    },
    keyboard: {
      enabled: true,
    },
    mousewheel: {
      thresholdDelta: 70,
    },
    spaceBetween: 30,
    loop: false,
    breakpoints: {
      640: {
        slidesPerView: 3,
      },
      1024: {
        slidesPerView: 4,
      },
    },
    on: {
      slideChange: (swiper) => {
        activeOverviewCard.value = swiper.activeIndex
      },
    },
  })

  const initialIndex = Math.min(1, overviewAttractions.value.length - 1)
  activeOverviewCard.value = initialIndex
  overviewSwiper.slideTo(initialIndex, 0, false)
}

// 知识图谱相关
const graphData = ref<KnowledgeGraphData | null>(null)
const graphCategories = ref<GraphCategory[]>([])
let kgChart: echarts.ECharts | null = null
let kgResizeHandler: (() => void) | null = null

const applyTripPlanPayload = async (payload: {
  plan: TripPlan
  graph?: KnowledgeGraphData | null
  planId?: string
}) => {
  tripPlan.value = payload.plan
  pendingBudgetItems.value = []

  if (payload.planId) {
    planId.value = payload.planId
    sessionStorage.setItem('planId', payload.planId)
  }

  sessionStorage.setItem('tripPlan', JSON.stringify(payload.plan))

  if (payload.graph) {
    graphData.value = payload.graph
    graphCategories.value = payload.graph.categories || []
    sessionStorage.setItem('graphData', JSON.stringify(payload.graph))
  } else {
    graphData.value = null
    graphCategories.value = []
    sessionStorage.removeItem('graphData')
  }

  await loadAttractionPhotos()
  if (activeSection.value === 'map') await ensureMapReady()
  if (activeSection.value === 'knowledge-graph') await ensureGraphReady()
  if (activeSection.value === 'overview') await initOverviewSwiper()
}

const restoreTripPlanFromResponse = async (response?: TripPlanResponse | null) => {
  if (!response?.data) return false
  await applyTripPlanPayload({
    plan: response.data,
    graph: response.graph_data || null,
    planId: String(response.plan_id || planId.value || ''),
  })
  return true
}

const destroyCurrentMap = () => {
  // 清理 Google Maps
  googleInfoWindows.forEach((iw) => { try { iw.close() } catch {} })
  googleInfoWindows = []
  googleMarkers.forEach((m) => { try { m.setMap(null) } catch {} })
  googleMarkers = []
  googlePolylines.forEach((p) => { try { p.setMap(null) } catch {} })
  googlePolylines = []
  googleDirectionsRenderers.forEach((r) => { try { r.setMap(null) } catch {} })
  googleDirectionsRenderers = []
  googleMap = null

  // 清理高德地图
  if (map) {
    try { map.destroy() } catch {}
    map = null
  }
  mapLabelOverlays = []
}

// 导航深链兜底：点击「到这里去」1.8s 后页面仍可见（App 未唤起）则跳高德 Web 版
const handleNavFallback = (e: MouseEvent) => {
  const target = e.target as HTMLElement | null
  const anchor = target?.closest?.('a[data-web]') as HTMLAnchorElement | null
  if (!anchor) return
  const web = anchor.getAttribute('data-web')
  if (!web) return
  setTimeout(() => {
    if (!document.hidden) window.location.href = web
  }, 1800)
}

const ensureMapReady = async () => {
  await nextTick()
  // Google Maps 优先检测
  if (mapProviderType.value === 'google' && googleMap) {
    google.maps.event.trigger(googleMap, 'resize')
    return
  }
  if (mapProviderType.value === 'amap' && map) {
    if (typeof map.resize === 'function') {
      map.resize()
    }
    return
  }
  // 都不存在则初始化
  await initMap()
}

const refreshMap = async () => {
  if (mapRefreshing.value) return
  mapRefreshing.value = true
  try {
    destroyCurrentMap()
    await nextTick()
    await initMap()
  } catch (error) {
    console.error('刷新地图失败:', error)
    message.error(t('result.messages.mapLoadFailed'))
  } finally {
    mapRefreshing.value = false
  }
}

const handleRuntimeSettingsUpdated = () => {
  destroyCurrentMap()
  if (activeSection.value === 'map') {
    void nextTick(async () => {
      await ensureMapReady()
    })
  }
}

const ensureGraphReady = async () => {
  if (!graphData.value) return
  await nextTick()
  if (!kgChart) {
    initKnowledgeGraph()
    return
  }
  kgChart.resize()
}

const CATEGORY_KEY_MAP: Record<string, string> = {
  // City
  '城市': 'city', '都市': 'city', 'city': 'city',
  // Schedule / Day
  '日程': 'schedule', '行程': 'schedule', 'schedule': 'schedule',
  'スケジュール': 'schedule',
  // Attraction
  '景点': 'attraction', '観光地': 'attraction', 'attraction': 'attraction',
  // Hotel
  '酒店': 'hotel', 'ホテル': 'hotel', 'hotel': 'hotel',
  // Meal / Dining
  '餐饮': 'meal', '食事': 'meal', 'meal': 'meal',
  'dining': 'meal', 'グルメ': 'meal',
  // Weather
  '天气': 'weather', '天気': 'weather', 'weather': 'weather',
  // Budget
  '预算': 'budget', '予算': 'budget', 'budget': 'budget',
  // Suggestion / Preference / Tips
  '偏好/建议': 'suggestion', '好み/提案': 'suggestion',
  'preference/suggestion': 'suggestion',
  'tips': 'suggestion', 'おすすめ': 'suggestion',
}

const CATEGORY_COLORS: Record<string, string> = {
  city: '#4A90D9',
  schedule: '#5B8FF9',
  attraction: '#5AD8A6',
  hotel: '#F6BD16',
  meal: '#E8684A',
  weather: '#6DC8EC',
  budget: '#FF9845',
  suggestion: '#B37FEB',
}

const normalizeCategoryKey = (name: string): string => {
  const key = name.toLowerCase()
  return CATEGORY_KEY_MAP[name] || CATEGORY_KEY_MAP[key] || name
}

const getCategoryColor = (name: string): string => {
  const key = normalizeCategoryKey(name)
  return CATEGORY_COLORS[key] || '#999'
}

const getCategoryLabel = (name: string): string => {
  const key = normalizeCategoryKey(name)
  if (key in CATEGORY_COLORS) {
    return t(`result.graph.categories.${key}`)
  }
  return name
}

type KgNodeVisualPreset = {
  size: number
  gradientStart: string
  gradientEnd: string | null
}

const KG_NODE_CATEGORY_COLORS: Record<string, { start: string; end: string | null }> = {
  city: { start: '#0B3D91', end: '#5EEAD4' },
  schedule: { start: '#0000FF', end: '#E06BE0' },
  attraction: { start: '#0F7A32', end: '#C8FF6A' },
  hotel: { start: '#f59e0b', end: '#fde68a' },
  meal: { start: '#B91C1C', end: '#FDBA74' },
  weather: { start: '#0369A1', end: '#BFDBFE' },
  budget: { start: '#ea580c', end: '#fdba74' },
  suggestion: { start: '#9333ea', end: '#f0abfc' },
}

const getKgCategoryPalette = (categoryName: string): { start: string; end: string | null } => {
  const categoryKey = normalizeCategoryKey(categoryName || '')
  return KG_NODE_CATEGORY_COLORS[categoryKey] || { start: getCategoryColor(categoryName), end: null }
}

const KG_NODE_SIZE_SCALE = 1.25

const getKgNodeVisualPreset = (rawSize: number, categoryName: string): KgNodeVisualPreset => {
  const baseSize = rawSize >= 70 ? 100 : rawSize >= 45 ? 80 : 60
  const size = Math.round(baseSize * KG_NODE_SIZE_SCALE)
  const palette = getKgCategoryPalette(categoryName)

  return {
    size,
    gradientStart: palette.start,
    gradientEnd: palette.end,
  }
}

const kgNodeSymbolCache = new Map<string, string>()
const kgLegendDotStyleCache = new Map<string, Record<string, string>>()

const buildFeatherCircleSvgDataUrl = (size: number, start: string, end: string | null): string => {
  const center = size / 2
  const radius = Math.round(size * 0.34)
  const gradientDef = end
    ? `<linearGradient id="kgNodeGradient" x1="0%" y1="0%" x2="0%" y2="100%">
         <stop offset="0%" stop-color="${start}" />
         <stop offset="100%" stop-color="${end}" />
       </linearGradient>`
    : ''
  const fillColor = end ? 'url(#kgNodeGradient)' : start

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 ${size} ${size}">
    <defs>
      ${gradientDef}
      <filter id="kgNodeBlur" x="-30%" y="-30%" width="160%" height="160%">
        <feGaussianBlur stdDeviation="4" />
      </filter>
    </defs>
    <circle cx="${center}" cy="${center}" r="${radius}" fill="${fillColor}" filter="url(#kgNodeBlur)" />
  </svg>`

  return `data:image/svg+xml;utf8,${encodeURIComponent(svg)}`
}

const getKgNodeSymbol = (visual: KgNodeVisualPreset): string => {
  const cacheKey = `${visual.size}-${visual.gradientStart}-${visual.gradientEnd ?? 'solid'}`
  const cachedSymbol = kgNodeSymbolCache.get(cacheKey)
  if (cachedSymbol) return cachedSymbol

  const symbol = `image://${buildFeatherCircleSvgDataUrl(visual.size, visual.gradientStart, visual.gradientEnd)}`
  kgNodeSymbolCache.set(cacheKey, symbol)
  return symbol
}

const getKgLegendDotStyle = (categoryName: string): Record<string, string> => {
  const palette = getKgCategoryPalette(categoryName)
  const cacheKey = `${palette.start}-${palette.end ?? 'solid'}`
  const cachedStyle = kgLegendDotStyleCache.get(cacheKey)
  if (cachedStyle) return cachedStyle

  const dataUrl = buildFeatherCircleSvgDataUrl(24, palette.start, palette.end)
  const style = { backgroundImage: `url("${dataUrl}")` }
  kgLegendDotStyleCache.set(cacheKey, style)
  return style
}

const buildKgBoundaryPositionMap = (
  nodes: any[],
  edges: any[],
  categories: GraphCategory[],
  width: number,
  height: number
): Map<string, { x: number; y: number }> => {
  const nodeKey = (id: unknown): string => String(id)
  const degreeMap = new Map<string, number>()

  nodes.forEach((node) => degreeMap.set(nodeKey(node.id), 0))
  edges.forEach((edge) => {
    const sourceKey = nodeKey(edge.source)
    const targetKey = nodeKey(edge.target)
    degreeMap.set(sourceKey, (degreeMap.get(sourceKey) || 0) + 1)
    degreeMap.set(targetKey, (degreeMap.get(targetKey) || 0) + 1)
  })

  let rootNodeKey = nodes.length > 0 ? nodeKey(nodes[0].id) : ''
  let maxDegree = -1
  nodes.forEach((node) => {
    const key = nodeKey(node.id)
    const degree = degreeMap.get(key) || 0
    if (degree > maxDegree) {
      maxDegree = degree
      rootNodeKey = key
    }
  })

  const groupedNodes = new Map<string, any[]>()
  nodes.forEach((node) => {
    const key = nodeKey(node.id)
    if (key === rootNodeKey) return

    const categoryName = categories?.[Number(node.category)]?.name || ''
    const categoryKey = normalizeCategoryKey(categoryName || 'misc')
    if (!groupedNodes.has(categoryKey)) groupedNodes.set(categoryKey, [])
    groupedNodes.get(categoryKey)!.push(node)
  })

  const orderedGroupKeys = Array.from(groupedNodes.keys()).sort((a, b) => {
    return (groupedNodes.get(b)?.length || 0) - (groupedNodes.get(a)?.length || 0)
  })

  const cx = width / 2
  const cy = height / 2
  const outerRadiusX = Math.max(80, width / 2 - 24)
  const outerRadiusY = Math.max(80, height / 2 - 24)
  const layerFactors = [1, 0.9, 0.8, 0.7]
  const positionMap = new Map<string, { x: number; y: number }>()

  if (rootNodeKey) {
    positionMap.set(rootNodeKey, { x: cx, y: cy })
  }

  orderedGroupKeys.forEach((groupKey, groupIndex) => {
    const group = groupedNodes.get(groupKey) || []
    if (group.length === 0) return

    const baseAngle = -Math.PI / 2 + (2 * Math.PI * groupIndex) / Math.max(1, orderedGroupKeys.length)
    const spread = Math.min(1.25, Math.max(0.55, group.length * 0.03))
    const layerStride = Math.max(1, Math.ceil(group.length / layerFactors.length))

    group.forEach((node, nodeIndex) => {
      const t = group.length === 1 ? 0 : nodeIndex / (group.length - 1) - 0.5
      const angle = baseAngle + t * spread
      const layerIndex = Math.min(layerFactors.length - 1, Math.floor(nodeIndex / layerStride))
      const layerFactor = layerFactors[layerIndex]

      const visualSize = Number(node.__visual?.size) || 90
      const nodeRadius = Math.round(visualSize * 0.34)
      const marginX = nodeRadius + 8
      const marginY = nodeRadius + 8

      let x = cx + Math.cos(angle) * outerRadiusX * layerFactor
      let y = cy + Math.sin(angle) * outerRadiusY * layerFactor
      x = Math.max(marginX, Math.min(width - marginX, x))
      y = Math.max(marginY, Math.min(height - marginY, y))

      positionMap.set(nodeKey(node.id), { x, y })
    })
  })

  return positionMap
}

onMounted(async () => {
  if (typeof window !== 'undefined') {
    window.addEventListener(RUNTIME_SETTINGS_UPDATED_EVENT, handleRuntimeSettingsUpdated)
    document.addEventListener('click', handleNavFallback)
  }
  const storedPlanId = String(sessionStorage.getItem('planId') || '')
  planId.value = String(route.query.plan_id || storedPlanId || '')
  if (planId.value) {
    sessionStorage.setItem('planId', planId.value)
  }

  const cachedPlanId = storedPlanId
  const data = sessionStorage.getItem('tripPlan')
  const canUseCachedData = Boolean(data) && (!planId.value || !cachedPlanId || cachedPlanId === planId.value)

  if (data && canUseCachedData) {
    const gd = sessionStorage.getItem('graphData')
    await applyTripPlanPayload({
      plan: JSON.parse(data),
      graph: gd ? JSON.parse(gd) : null,
      planId: planId.value || cachedPlanId,
    })
    return
  }

  if (planId.value) {
    try {
      const task = await pollTaskStatus(planId.value)
      if (task?.status === 'completed' && task.result) {
        const restored = await restoreTripPlanFromResponse(task.result)
        if (restored) return
      }
      if (task?.status === 'failed') {
        message.error(task.error || t('result.noTripPlanDesc'))
      }
    } catch (error) {
      console.error('结果页从后端回补旅行计划失败:', error)
    }
  }
})

watch(activeSection, async (section) => {
  if (!tripPlan.value) return
  if (section === 'map') await ensureMapReady()
  if (section === 'knowledge-graph') await ensureGraphReady()
  if (section === 'overview') await initOverviewSwiper()
})

watch(
  overviewAttractions,
  (items) => {
    if (items.length === 0) {
      activeOverviewCard.value = -1
      return
    }
    if (activeOverviewCard.value < 0 || activeOverviewCard.value >= items.length) {
      activeOverviewCard.value = Math.min(1, items.length - 1)
    }
    if (activeSection.value === 'overview') {
      void initOverviewSwiper()
    }
  },
  { immediate: true }
)

onUnmounted(() => {
  if (typeof window !== 'undefined') {
    window.removeEventListener(RUNTIME_SETTINGS_UPDATED_EVENT, handleRuntimeSettingsUpdated)
    document.removeEventListener('click', handleNavFallback)
  }
  destroyOverviewSwiper()
  destroyCurrentMap()
  if (kgResizeHandler) {
    window.removeEventListener('resize', kgResizeHandler)
    kgResizeHandler = null
  }
  if (kgChart) {
    kgChart.dispose()
    kgChart = null
  }
})

const goBack = () => {
  router.push('/')
}

// 滚动到指定区域
const scrollToSection = ({ key }: { key: string }) => {
  if (key.startsWith('day-')) {
    const dayIndex = Number(key.replace('day-', ''))
    if (!Number.isNaN(dayIndex)) {
      activeDays.value = [dayIndex]
      activeSection.value = 'days'
      return
    }
  }

  activeSection.value = key
}

const goToDayFromOverview = (dayArrayIndex: number) => {
  activeDays.value = [dayArrayIndex]
  activeSection.value = 'days'
}

const setActiveOverviewCard = (index: number) => {
  activeOverviewCard.value = index
  if (overviewSwiper && overviewSwiper.activeIndex !== index) {
    overviewSwiper.slideTo(index)
  }
}

// 切换编辑模式
const toggleEditMode = () => {
  editMode.value = true
  // 保存原始数据用于取消编辑
  originalPlan.value = JSON.parse(JSON.stringify(tripPlan.value))
  message.info(t('result.messages.enterEditMode'))
}

// 保存修改（本地 + 回写后端持久化）
const saveChanges = async () => {
  recalculateBudgetTotals()
  // 更新sessionStorage
  if (tripPlan.value) {
    sessionStorage.setItem('tripPlan', JSON.stringify(tripPlan.value))
    if (planId.value) {
      try {
        await saveTripPlan(planId.value, tripPlan.value)
        message.success(t('result.messages.changesSavedToServer'))
      } catch (err) {
        console.error('保存行程到后端失败:', err)
        message.warning(t('result.messages.changesSavedLocalOnly'))
      }
    } else {
      message.warning(t('result.messages.changesSavedLocalOnly'))
    }
  }
  editMode.value = false

  // 重新初始化地图以反映更改
  if (activeSection.value === 'map') {
    void refreshMap()
  } else {
    destroyCurrentMap()
  }
}

// 取消编辑
const cancelEdit = () => {
  if (originalPlan.value) {
    tripPlan.value = JSON.parse(JSON.stringify(originalPlan.value))
  }
  pendingBudgetItems.value = []
  editMode.value = false
  message.info(t('result.messages.editCanceled'))
}

// 删除景点
const deleteAttraction = (dayIndex: number, attrIndex: number) => {
  if (!tripPlan.value) return

  const day = tripPlan.value.days[dayIndex]
  if (day.attractions.length <= 1) {
    message.warning(t('result.messages.keepOneAttraction'))
    return
  }

  day.attractions.splice(attrIndex, 1)
  recalculateBudgetTotals()
  message.success(t('result.messages.attractionDeleted'))
}

// 移动景点顺序
const moveAttraction = (dayIndex: number, attrIndex: number, direction: 'up' | 'down') => {
  if (!tripPlan.value) return

  const day = tripPlan.value.days[dayIndex]
  const attractions = day.attractions

  if (direction === 'up' && attrIndex > 0) {
    [attractions[attrIndex], attractions[attrIndex - 1]] = [attractions[attrIndex - 1], attractions[attrIndex]]
  } else if (direction === 'down' && attrIndex < attractions.length - 1) {
    [attractions[attrIndex], attractions[attrIndex + 1]] = [attractions[attrIndex + 1], attractions[attrIndex]]
  }
}

// 景点行内编辑：门票 免费/收费 切换（切到收费时给默认值便于修改，0 即免费）
const setTicketMode = (item: Attraction, mode: unknown) => {
  if (mode === 'free') {
    item.ticket_price = 0
  } else if (!item.ticket_price) {
    item.ticket_price = 10
  }
}

// 景点行内编辑：预约开关（关闭时清空预约提示）
const setReservation = (item: Attraction, checked: unknown) => {
  item.reservation_required = !!checked
  if (!checked) item.reservation_tips = ''
}

// ========== 新增景点 ==========

const openAddAttractionModal = (dayArrayIndex: number) => {
  addAttractionTargetDay.value = dayArrayIndex
  poiSearchKeyword.value = ''
  poiSearchResults.value = []
  manualAttraction.value = {
    name: '',
    address: '',
    visit_duration: 90,
    description: '',
    location: null,
    poi_id: '',
    ticket_free: true,
    ticket_price: 0,
    reservation_required: false,
    reservation_tips: '',
  }
  addAttractionTab.value = 'search'
  addAttractionVisible.value = true
}

const doSearchPoi = async () => {
  const kw = poiSearchKeyword.value.trim()
  if (!kw || !tripPlan.value) return
  poiSearching.value = true
  try {
    // 以目标天所在城市搜索，缺省回退主城市
    const day = tripPlan.value.days[addAttractionTargetDay.value ?? 0]
    const city = day?.city || tripPlan.value.city
    poiSearchResults.value = await searchPoi(kw, city)
    if (!poiSearchResults.value.length) {
      message.info(t('result.poiSearchNoResult'))
    }
  } catch (err) {
    console.error('POI搜索失败:', err)
    message.error(t('result.poiSearchFailed'))
  } finally {
    poiSearching.value = false
  }
}

// 景点列表变化后的公共收尾：重算预算 + 写本地缓存 + 地图失效重建
const afterAttractionListChanged = () => {
  recalculateBudgetTotals()
  if (tripPlan.value) {
    sessionStorage.setItem('tripPlan', JSON.stringify(tripPlan.value))
  }
  if (activeSection.value === 'map') {
    void refreshMap()
  } else {
    destroyCurrentMap()
  }
}

/** 选中搜索结果：回填表单并切到手动 tab，补充门票/预约等属性后再确认添加 */
const pickSearchResult = (poi: POISearchItem) => {
  manualAttraction.value.name = poi.name
  manualAttraction.value.address = poi.address || ''
  manualAttraction.value.location = poi.location
    ? { longitude: poi.location.longitude, latitude: poi.location.latitude }
    : null
  manualAttraction.value.poi_id = poi.id || ''
  addAttractionTab.value = 'manual'
}

const submitManualAttraction = () => {
  const m = manualAttraction.value
  const name = m.name.trim()
  if (!name) {
    message.warning(t('result.manualNameRequired'))
    return
  }
  if (!tripPlan.value || addAttractionTargetDay.value === null) return
  const day = tripPlan.value.days[addAttractionTargetDay.value]
  if (!day) return
  day.attractions.push({
    name,
    address: m.address.trim(),
    // 纯手动填写时无坐标（0,0 会被地图标记函数自动跳过）；搜索回填的带真实定位
    location: m.location ?? { longitude: 0, latitude: 0 },
    visit_duration: m.visit_duration || 60,
    description: m.description.trim(),
    ticket_price: m.ticket_free ? 0 : m.ticket_price || 0,
    reservation_required: m.reservation_required,
    reservation_tips: m.reservation_required ? m.reservation_tips.trim() : '',
    poi_id: m.poi_id || undefined,
  })
  afterAttractionListChanged()
  addAttractionVisible.value = false
  message.success(t('result.messages.attractionAdded', { name }))
}

// ========== 新增/编辑餐饮 ==========

const openMealModal = (dayArrayIndex: number) => {
  mealModalDayIndex.value = dayArrayIndex
  mealModalVisible.value = true
}

const mealModalCity = computed(() => {
  if (!tripPlan.value || mealModalDayIndex.value === null) return tripPlan.value?.city || ''
  const day = tripPlan.value.days[mealModalDayIndex.value]
  return day?.city || tripPlan.value.city || ''
})

const mealModalAttractions = computed(() => {
  if (!tripPlan.value || mealModalDayIndex.value === null) return []
  return (tripPlan.value.days[mealModalDayIndex.value]?.attractions || []).map((a) => a.name)
})

const mealTypeOptions = computed(() => [
  { value: 'breakfast', label: t('result.meals.breakfast') },
  { value: 'lunch', label: t('result.meals.lunch') },
  { value: 'dinner', label: t('result.meals.dinner') },
  { value: 'snack', label: t('result.meals.snack') },
])

const onMealAdd = (meal: Meal) => {
  if (!tripPlan.value || mealModalDayIndex.value === null) return
  const day = tripPlan.value.days[mealModalDayIndex.value]
  if (!day) return
  if (!Array.isArray(day.meals)) day.meals = []
  day.meals.push(meal)
  afterAttractionListChanged()
  message.success(t('result.messages.mealAdded', { name: meal.name }))
}

const deleteMeal = (dayArrayIndex: number, mealIndex: number) => {
  if (!tripPlan.value) return
  const day = tripPlan.value.days[dayArrayIndex]
  if (!day?.meals) return
  const [removed] = day.meals.splice(mealIndex, 1)
  afterAttractionListChanged()
  if (removed) message.success(t('result.messages.mealDeleted', { name: removed.name }))
}

// ========== 新增/编辑住宿 ==========

const openHotelModal = (dayArrayIndex: number) => {
  hotelModalDayIndex.value = dayArrayIndex
  hotelModalVisible.value = true
}

const hotelModalCity = computed(() => {
  if (!tripPlan.value || hotelModalDayIndex.value === null) return tripPlan.value?.city || ''
  const day = tripPlan.value.days[hotelModalDayIndex.value]
  return day?.city || tripPlan.value.city || ''
})

const onHotelAdd = (hotel: Hotel) => {
  if (!tripPlan.value || hotelModalDayIndex.value === null) return
  const day = tripPlan.value.days[hotelModalDayIndex.value]
  if (!day) return
  day.hotel = hotel
  afterAttractionListChanged()
  message.success(t('result.messages.hotelAdded', { name: hotel.name }))
}

const deleteHotel = (dayArrayIndex: number) => {
  if (!tripPlan.value) return
  const day = tripPlan.value.days[dayArrayIndex]
  if (!day?.hotel) return
  day.hotel = null
  afterAttractionListChanged()
  message.success(t('result.messages.hotelDeleted'))
}

// ========== 跨天移动景点 ==========

const openMoveModal = (dayArrayIndex: number, attrIndex: number) => {
  if (!tripPlan.value) return
  const attraction = tripPlan.value.days[dayArrayIndex]?.attractions[attrIndex]
  if (!attraction) return
  moveSourceDay.value = dayArrayIndex
  moveSourceIndex.value = attrIndex
  movingAttractionName.value = attraction.name
  moveTargetDay.value = null
  moveAttractionVisible.value = true
}

const moveDayOptions = computed(() => {
  if (!tripPlan.value || moveSourceDay.value === null) return []
  return tripPlan.value.days
    .map((d, i) => ({
      value: i,
      label: `${t('common.dayNumber', { day: i + 1 })}${d.date ? ` · ${d.date}` : ''}${d.city ? ` · ${d.city}` : ''}`,
    }))
    .filter((opt) => opt.value !== moveSourceDay.value)
})

const confirmMoveToDay = () => {
  if (
    !tripPlan.value ||
    moveSourceDay.value === null ||
    moveSourceIndex.value === null ||
    moveTargetDay.value === null
  ) {
    return
  }
  const from = tripPlan.value.days[moveSourceDay.value]
  const to = tripPlan.value.days[moveTargetDay.value]
  if (!from || !to) return
  if (from.attractions.length <= 1) {
    message.warning(t('result.messages.keepOneAttraction'))
    return
  }
  const [moved] = from.attractions.splice(moveSourceIndex.value, 1)
  to.attractions.push(moved)
  afterAttractionListChanged()
  moveAttractionVisible.value = false
  message.success(t('result.messages.attractionMoved', { name: moved.name }))
}

// ========== 导出路书（单文件 HTML） ==========

const exportAsHtml = async () => {
  if (!tripPlan.value) return
  exportingRoadbook.value = true
  try {
    await exportRoadbook(tripPlan.value, attractionPhotos.value, (a) => toProxiedPhotoUrl(a.image_url))
    message.success(t('result.messages.roadbookExported'))
  } catch (err) {
    console.error('导出路书失败:', err)
    message.error(t('result.messages.roadbookExportFailed'))
  } finally {
    exportingRoadbook.value = false
  }
}

// ========== 导出 Markdown（博客二次创作） ==========

const exportAsMarkdown = async () => {
  if (!tripPlan.value) return
  try {
    await exportRoadbookMarkdown(tripPlan.value)
    message.success(t('result.messages.markdownExported'))
  } catch (err) {
    console.error('导出Markdown失败:', err)
    message.error(t('result.messages.markdownExportFailed'))
  }
}

const getMealLabel = (type: string): string => {
  const labels: Record<string, string> = {
    breakfast: t('result.meals.breakfast'),
    lunch: t('result.meals.lunch'),
    dinner: t('result.meals.dinner'),
    snack: t('result.meals.snack')
  }
  return labels[type] || type
}

const toBudgetNumber = (value: unknown): number => {
  const numeric = Number(value)
  if (!Number.isFinite(numeric) || numeric <= 0) return 0
  return numeric
}

const roundBudgetAmount = (value: number): number => {
  return Math.round((value + Number.EPSILON) * 100) / 100
}

const formatBudgetAmount = (value: number): string => {
  const rounded = roundBudgetAmount(value)
  return Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(2)
}

const getBudgetTypeLabel = (type: BudgetItemType): string => {
  const labels: Record<BudgetItemType, string> = {
    attraction: t('result.budget.attraction'),
    hotel: t('result.budget.hotel'),
    meal: t('result.budget.meal'),
    transport: t('result.budget.transport'),
  }
  return labels[type]
}

const cloneData = <T>(data: T): T => JSON.parse(JSON.stringify(data)) as T

const recalculateBudgetTotals = (transportationOverride?: number) => {
  if (!tripPlan.value) return

  let attractionTotal = 0
  let hotelTotal = 0
  let mealTotal = 0

  tripPlan.value.days.forEach((day) => {
    day.attractions.forEach((attraction) => {
      attractionTotal += toBudgetNumber(attraction.ticket_price)
    })

    if (day.hotel) {
      hotelTotal += toBudgetNumber(day.hotel.estimated_cost)
    }

    day.meals.forEach((meal) => {
      mealTotal += toBudgetNumber(meal.estimated_cost)
    })
  })

  const transportationTotal = roundBudgetAmount(
    transportationOverride ?? toBudgetNumber(tripPlan.value.budget?.total_transportation)
  )

  tripPlan.value.budget = {
    total_attractions: roundBudgetAmount(attractionTotal),
    total_hotels: roundBudgetAmount(hotelTotal),
    total_meals: roundBudgetAmount(mealTotal),
    total_transportation: transportationTotal,
    total: roundBudgetAmount(attractionTotal + hotelTotal + mealTotal + transportationTotal),
  }
}

const budgetItems = computed<BudgetDetailItem[]>(() => {
  if (!tripPlan.value) return []

  const items: BudgetDetailItem[] = []

  tripPlan.value.days.forEach((day, dayIndex) => {
    const dayNumber = dayIndex + 1

    day.attractions.forEach((attraction, attractionIndex) => {
      const amount = roundBudgetAmount(toBudgetNumber(attraction.ticket_price))
      if (amount <= 0) return
      items.push({
        id: `attraction-${dayIndex}-${attractionIndex}`,
        type: 'attraction',
        dayIndex,
        dayNumber,
        name: attraction.name,
        amount,
        sourceIndex: attractionIndex,
      })
    })

    if (day.hotel) {
      const amount = roundBudgetAmount(toBudgetNumber(day.hotel.estimated_cost))
      if (amount > 0) {
        items.push({
          id: `hotel-${dayIndex}`,
          type: 'hotel',
          dayIndex,
          dayNumber,
          name: day.hotel.name,
          amount,
        })
      }
    }

    day.meals.forEach((meal, mealIndex) => {
      const amount = roundBudgetAmount(toBudgetNumber(meal.estimated_cost))
      if (amount <= 0) return
      items.push({
        id: `meal-${dayIndex}-${mealIndex}`,
        type: 'meal',
        dayIndex,
        dayNumber,
        name: `${getMealLabel(meal.type)} · ${meal.name}`,
        amount,
        sourceIndex: mealIndex,
      })
    })
  })

  const transportTotal = roundBudgetAmount(toBudgetNumber(tripPlan.value.budget?.total_transportation))
  const transportDays = tripPlan.value.days
    .map((day, dayIndex) => ({ day, dayIndex }))
    .filter(({ day }) => Boolean(day.transportation && day.transportation.trim()))

  if (transportTotal > 0 && transportDays.length > 0) {
    const avg = roundBudgetAmount(transportTotal / transportDays.length)
    let remaining = transportTotal

    transportDays.forEach(({ day, dayIndex }, index) => {
      const amount = index === transportDays.length - 1 ? remaining : Math.min(avg, remaining)
      remaining = roundBudgetAmount(remaining - amount)
      items.push({
        id: `transport-${dayIndex}`,
        type: 'transport',
        dayIndex,
        dayNumber: day.day_index + 1,
        name: day.transportation,
        amount: roundBudgetAmount(amount),
      })
    })
  }

  return items
})

const filteredBudgetItems = computed<BudgetDetailItem[]>(() => {
  let items = budgetItems.value

  if (budgetFilterType.value !== 'all') {
    items = items.filter((item) => item.type === budgetFilterType.value)
  }

  const sorted = [...items]
  sorted.sort((a, b) => {
    const dayA = a.dayNumber ?? Number.MAX_SAFE_INTEGER
    const dayB = b.dayNumber ?? Number.MAX_SAFE_INTEGER

    switch (budgetSortMode.value) {
      case 'amountAsc':
        return a.amount - b.amount
      case 'dayAsc':
        return dayA - dayB || b.amount - a.amount
      case 'dayDesc':
        return dayB - dayA || b.amount - a.amount
      case 'amountDesc':
      default:
        return b.amount - a.amount
    }
  })

  return sorted
})

const editBudgetItemAmount = (item: BudgetDetailItem) => {
  if (!tripPlan.value || item.dayIndex === null) return

  const day = tripPlan.value.days[item.dayIndex]
  if (!day) return

  const input = window.prompt(
    t('result.budget.editPrompt', {
      name: item.name,
      amount: formatBudgetAmount(item.amount),
    }),
    formatBudgetAmount(item.amount)
  )

  if (input === null) return

  const numeric = Number(input.trim())
  if (!Number.isFinite(numeric) || numeric < 0) {
    message.warning(t('result.messages.budgetInvalidAmount'))
    return
  }

  const nextAmount = roundBudgetAmount(numeric)
  if (nextAmount === roundBudgetAmount(item.amount)) return

  const confirmed = window.confirm(
    t('result.budget.editConfirm', {
      name: item.name,
      amount: formatBudgetAmount(nextAmount),
    })
  )
  if (!confirmed) return

  let changed = false

  if (item.type === 'attraction' && typeof item.sourceIndex === 'number' && day.attractions[item.sourceIndex]) {
    day.attractions[item.sourceIndex].ticket_price = nextAmount
    changed = true
  }

  if (item.type === 'meal' && typeof item.sourceIndex === 'number' && day.meals[item.sourceIndex]) {
    day.meals[item.sourceIndex].estimated_cost = nextAmount
    changed = true
  }

  if (item.type === 'hotel' && day.hotel) {
    day.hotel.estimated_cost = nextAmount
    changed = true
  }

  const transportationTotal =
    item.type === 'transport'
      ? Math.max(
          0,
          roundBudgetAmount(toBudgetNumber(tripPlan.value.budget?.total_transportation) - item.amount + nextAmount)
        )
      : undefined

  if (item.type === 'transport' && day.transportation && day.transportation.trim()) {
    changed = true
  }

  if (!changed) return

  recalculateBudgetTotals(transportationTotal)
  sessionStorage.setItem('tripPlan', JSON.stringify(tripPlan.value))
  message.success(t('result.messages.budgetAmountUpdated'))
}

const deleteBudgetItem = (item: BudgetDetailItem) => {
  if (!tripPlan.value || item.dayIndex === null) return

  const day = tripPlan.value.days[item.dayIndex]
  if (!day) return

  let changed = false
  let restorePayload: BudgetRestorePayload | null = null

  if (item.type === 'attraction' && typeof item.sourceIndex === 'number') {
    const attraction = day.attractions[item.sourceIndex]
    if (attraction) {
      restorePayload = {
        type: 'attraction',
        attraction: cloneData(attraction),
        insertIndex: item.sourceIndex,
      }
      day.attractions.splice(item.sourceIndex, 1)
      changed = true
    }
  }

  if (item.type === 'meal' && typeof item.sourceIndex === 'number') {
    const meal = day.meals[item.sourceIndex]
    if (meal) {
      restorePayload = {
        type: 'meal',
        meal: cloneData(meal),
        insertIndex: item.sourceIndex,
      }
      day.meals.splice(item.sourceIndex, 1)
      changed = true
    }
  }

  if (item.type === 'hotel') {
    if (day.hotel) {
      restorePayload = {
        type: 'hotel',
        hotel: cloneData(day.hotel),
        accommodation: day.accommodation || '',
      }
      day.hotel = undefined
      day.accommodation = ''
      changed = true
    }
  }

  if (item.type === 'transport') {
    if (day.transportation && day.transportation.trim()) {
      restorePayload = {
        type: 'transport',
        transportation: day.transportation,
      }
      day.transportation = ''
      changed = true
    }
  }

  if (!changed || !restorePayload) return

  pendingBudgetItems.value.unshift({
    uid: `${item.id}-${Date.now()}`,
    base: cloneData(item),
    payload: restorePayload,
  })

  const transportationTotal =
    item.type === 'transport'
      ? Math.max(
          0,
          roundBudgetAmount(
            toBudgetNumber(tripPlan.value.budget?.total_transportation) - roundBudgetAmount(item.amount)
          )
        )
      : undefined

  recalculateBudgetTotals(transportationTotal)
  sessionStorage.setItem('tripPlan', JSON.stringify(tripPlan.value))

  destroyCurrentMap()

  message.success(t('result.messages.budgetItemDeleted'))
}

const restoreBudgetItem = (pendingItem: BudgetRestoreItem) => {
  if (!tripPlan.value || pendingItem.base.dayIndex === null) return

  const day = tripPlan.value.days[pendingItem.base.dayIndex]
  if (!day) return

  let changed = false

  if (pendingItem.payload.type === 'attraction') {
    const insertAt = Math.max(0, Math.min(pendingItem.payload.insertIndex, day.attractions.length))
    day.attractions.splice(insertAt, 0, cloneData(pendingItem.payload.attraction))
    changed = true
  }

  if (pendingItem.payload.type === 'meal') {
    const insertAt = Math.max(0, Math.min(pendingItem.payload.insertIndex, day.meals.length))
    day.meals.splice(insertAt, 0, cloneData(pendingItem.payload.meal))
    changed = true
  }

  if (pendingItem.payload.type === 'hotel') {
    day.hotel = cloneData(pendingItem.payload.hotel)
    day.accommodation = pendingItem.payload.accommodation
    changed = true
  }

  if (pendingItem.payload.type === 'transport') {
    day.transportation = pendingItem.payload.transportation
    changed = true
  }

  if (!changed) return

  const transportationTotal =
    pendingItem.base.type === 'transport'
      ? roundBudgetAmount(toBudgetNumber(tripPlan.value.budget?.total_transportation) + pendingItem.base.amount)
      : undefined

  recalculateBudgetTotals(transportationTotal)
  pendingBudgetItems.value = pendingBudgetItems.value.filter((item) => item.uid !== pendingItem.uid)
  sessionStorage.setItem('tripPlan', JSON.stringify(tripPlan.value))

  destroyCurrentMap()

  message.success(t('result.messages.budgetItemRestored'))
}

// 将小红书图片直链包装为后端代理地址，规避图片 CDN 的 Referer 防盗链（issue #28）
const toProxiedPhotoUrl = (url?: string | null): string => {
  if (!url) return ''
  return `${getRuntimeApiBaseUrl()}/api/poi/image?url=${encodeURIComponent(url)}`
}

// 加载所有景点图片
const loadAttractionPhotos = async () => {
  if (!tripPlan.value) return

  const apiBase = getRuntimeApiBaseUrl()
  const city = tripPlan.value.city
  const uniqueNames = Array.from(
    new Set(
      tripPlan.value.days.flatMap((day) => day.attractions.map((attraction) => attraction.name))
    )
  ).filter((name) => name && !attractionPhotos.value[name])

  if (uniqueNames.length === 0) return

  const concurrencyLimit = 4
  let currentIndex = 0

  const loadNextPhoto = async () => {
    while (currentIndex < uniqueNames.length) {
      const index = currentIndex
      currentIndex += 1
      const name = uniqueNames[index]

      try {
        const response = await fetch(
          `${apiBase}/api/poi/photo?name=${encodeURIComponent(name)}&city=${encodeURIComponent(city)}`
        )
        const data = await response.json()
        if (data.success && data.data.photo_url) {
          // 直链带时效签名会过期，统一改走后端 name 键代理（缓存 miss 时自动重搜重取）
          attractionPhotos.value[name] = `${apiBase}/api/poi/image?name=${encodeURIComponent(name)}`
        }
      } catch (err) {
        console.error(`获取${name}图片失败:`, err)
      }
    }
  }

  const workers = Array.from(
    { length: Math.min(concurrencyLimit, uniqueNames.length) },
    () => loadNextPhoto()
  )
  await Promise.all(workers)
}

// 获取景点图片
const getAttractionImage = (name: string, _index: number): string => {
  // 如果已加载真实图片,返回真实图片
  if (attractionPhotos.value[name]) {
    return attractionPhotos.value[name]
  }

  // 返回一个统一的深色占位图
  const bg = '#1a262f'
  const textColor = 'rgba(255,255,255,0.4)'

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300">
    <rect width="400" height="300" fill="${bg}"/>
    <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="24" font-weight="bold" fill="${textColor}">${name}</text>
  </svg>`

  return `data:image/svg+xml;base64,${btoa(unescape(encodeURIComponent(svg)))}`
}

// 图片加载失败时的处理
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  // 使用深色占位图
  const label = encodeURIComponent(t('result.imageLoadFailed'))
  img.src = `data:image/svg+xml,%3Csvg xmlns="http://www.w3.org/2000/svg" width="400" height="300"%3E%3Crect width="400" height="300" fill="%231a262f"/%3E%3Ctext x="50%25" y="50%25" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="18" fill="rgba(255,255,255,0.4)"%3E${label}%3C/text%3E%3C/svg%3E`
}
// ========== 知识图谱初始化 ==========
const initKnowledgeGraph = () => {
  if (!graphData.value) return

  const container = document.getElementById('kg-chart-container')
  if (!container) return

  // 如果已存在实例则销毁
  if (kgChart) {
    kgChart.dispose()
  }

  kgChart = echarts.init(container, 'grey')
  const containerWidth = Math.max(container.clientWidth, 320)
  const containerHeight = Math.max(container.clientHeight, 320)
  const nodesWithVisual = graphData.value.nodes.map((node) => {
    const rawSize = Number(node.symbolSize) || 40
    const categoryName = graphData.value?.categories?.[Number(node.category)]?.name || ''
    const visual = getKgNodeVisualPreset(rawSize, categoryName)
    return {
      ...node,
      __visual: visual,
    }
  })
  const boundaryPositionMap = buildKgBoundaryPositionMap(
    nodesWithVisual,
    graphData.value.edges,
    graphData.value.categories,
    containerWidth,
    containerHeight
  )
  const kgForceGravity = containerWidth < 500 ? 0.2 : 0.06
  const kgForceRepulsion = containerWidth < 500 ? 360 : 520
  const kgForceEdgeLength: [number, number] = containerWidth < 500 ? [60, 140] : [95, 220]

  const option: echarts.EChartsOption = {
    backgroundColor: 'transparent',
    tooltip: {
      trigger: 'item',
      backgroundColor: 'rgba(12, 23, 32, 0.94)',
      borderColor: 'rgba(215, 110, 66, 0.35)',
      borderWidth: 1,
      padding: [12, 16],
      textStyle: { color: '#fff', fontSize: 13 },
      formatter: (params: any) => {
        if (params.dataType === 'node') {
          const catName = graphData.value?.categories[params.data.category]?.name || ''
          const cat = getCategoryLabel(catName)
          let tip = `<b style="color:#ffe3d6;font-size:15px">${params.data.name}</b><br/>`
          tip += `<span style="color:#aaa">${t('result.graph.type')}:</span>${cat}<br/>`
          if (params.data.value) {
            tip += `<span style="color:#aaa">${t('result.graph.detail')}:</span>${params.data.value}`
          }
          return tip
        }
        if (params.dataType === 'edge') {
          return `<span style="color:#ffe3d6">${params.data.label || t('result.graph.relation')}</span>`
        }
        return ''
      }
    },
    legend: {
      show: false  // 使用自定义legend
    },
    animationDuration: 1500,
    animationEasingUpdate: 'quinticInOut',
    series: [
      {
        type: 'graph',
        layout: 'force',
        data: nodesWithVisual.map(node => {
          const visual = node.__visual as KgNodeVisualPreset
          const nodeSymbol = getKgNodeSymbol(visual)
          const point = boundaryPositionMap.get(String(node.id))
          const labelFontSize = visual.size >= 140 ? 10 : visual.size >= 110 ? 9 : 8
          const labelMaxChars = visual.size >= 140 ? 7 : visual.size >= 110 ? 6 : 5
          const labelWidth = Math.round(visual.size * 0.52)

          return {
            ...node,
            x: point?.x ?? containerWidth / 2,
            y: point?.y ?? containerHeight / 2,
            fixed: Boolean(point && point.x === containerWidth / 2 && point.y === containerHeight / 2),
            symbol: nodeSymbol,
            symbolSize: visual.size,
            itemStyle: {
              ...(node.itemStyle || {}),
              borderColor: 'rgba(0, 0, 0, 0)',
              borderWidth: 0,
              shadowBlur: 0,
              shadowColor: 'rgba(0, 0, 0, 0)',
            },
            label: {
              show: visual.size >= 60,
              position: 'inside' as const,
              distance: 0,
              fontSize: labelFontSize,
              width: labelWidth,
              overflow: 'truncate',
              ellipsis: '…',
              align: 'center' as const,
              verticalAlign: 'middle' as const,
              lineHeight: labelFontSize + 2,
              color: '#fff',
              fontWeight: 'bold' as const,
              formatter: (params: any) => {
                const name = String(params.data.name || '')
                return name.length > labelMaxChars ? name.slice(0, labelMaxChars) + '…' : name
              },
            },
          }
        }),
        links: graphData.value.edges.map(edge => ({
          ...edge,
          lineStyle: {
            color: 'rgba(255, 255, 255, 0.15)',
            width: 1.5,
            curveness: 0.1,
          },
          label: {
            show: true,
            formatter: edge.label || '',
            fontSize: 10,
            color: 'rgba(255, 255, 255, 0.45)',
          },
        })),
        categories: graphData.value.categories,
        roam: true,
        draggable: true,
        force: {
          initLayout: 'none',
          repulsion: kgForceRepulsion,
          gravity: kgForceGravity,
          edgeLength: kgForceEdgeLength,
          friction: 0.2,
          layoutAnimation: true,
        },
        emphasis: {
          focus: 'adjacency',
          lineStyle: { width: 4, color: '#d76e42' },
          itemStyle: { borderColor: '#d76e42', borderWidth: 3 },
        },
        edgeSymbol: ['none', 'arrow'],
        edgeSymbolSize: [0, 8],
      },
    ],
  }

  kgChart.setOption(option)

  // 响应窗口变化：重算边界偏置坐标，防止节点越界
  if (kgResizeHandler) {
    window.removeEventListener('resize', kgResizeHandler)
  }
  kgResizeHandler = () => {
    if (!graphData.value) return
    initKnowledgeGraph()
  }
  window.addEventListener('resize', kgResizeHandler)
}

const escapeHtml = (value: unknown): string => {
  return String(value ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

const buildInfoWindowContent = (attraction: any): string => {
  const name = escapeHtml(attraction.name || t('common.noData'))
  const address = escapeHtml(attraction.address || t('common.noData'))
  const visitDuration = Number.isFinite(attraction.visit_duration) ? attraction.visit_duration : '—'
  const dayAttractionText = escapeHtml(
    t('result.mapInfo.dayAttraction', { day: attraction.dayIndex + 1, index: attraction.attrIndex + 1 })
  )
  const minuteUnit = escapeHtml(t('result.minuteUnit'))

  return `
    <div class="tripxu-map-tooltip tripxu-map-tooltip--plain">
      <p class="tripxu-map-tooltip__line tripxu-map-tooltip__line--title">${name}</p>
      <p class="tripxu-map-tooltip__line">${dayAttractionText}</p>
      <p class="tripxu-map-tooltip__line">${address}</p>
      <p class="tripxu-map-tooltip__line">${visitDuration}${minuteUnit}</p>
    </div>
  `
}

type RouteMode = 'driving' | 'walking' | 'straight'

const detectRouteMode = (transportation: string): RouteMode => {
  const normalized = (transportation || '').toLowerCase()
  if (/(步行|徒步|散步|walk|walking)/i.test(normalized)) return 'walking'
  if (/(驾车|开车|自驾|打车|出租车|car|drive|driving|taxi)/i.test(normalized)) return 'driving'
  return 'driving'
}
// 初始化地图入口
const initMap = async () => {
  const generation = ++mapInitGeneration

  // 1. 先尝试从 localStorage 读取 Google Maps API Key
  let googleKey = getRuntimeGoogleMapsApiKey()

  // 2. 如果 localStorage 没有缓存，主动从后端拉取一次
  if (!googleKey) {
    try {
      const backendSettings = await getBackendRuntimeSettings()
      if (backendSettings.google_maps_api_key) {
        googleKey = backendSettings.google_maps_api_key
        // 同步到 localStorage，下次不再需要请求后端
        setRuntimeGoogleMapsApiKey(googleKey)
      }
    } catch (err) {
      console.warn('从后端获取 Google Maps 配置失败:', err)
    }
  }

  if (generation !== mapInitGeneration) return

  // 3. 尝试初始化 Google Maps
  if (googleKey) {
    let timeoutHandle: ReturnType<typeof setTimeout> | undefined
    try {
      // 超时控制：如果 5 秒内未加载完，强制 reject 以触发降级
      const timeoutPromise = new Promise<never>((_, reject) => {
        timeoutHandle = setTimeout(() => reject(new Error('Google Maps 加载超时，可能由于网络环境限制')), 5000)
      })
      const initPromise = initGoogleMap(googleKey, generation)
      await Promise.race([initPromise, timeoutPromise])
      return
    } catch (error) {
      console.warn('Google Maps 加载失败，即将降级到高德地图:', error)
      if (generation !== mapInitGeneration) return
      destroyCurrentMap()
      // 等待 DOM 更新，确保高德容器可以显示
      await nextTick()
    } finally {
      clearTimeout(timeoutHandle)
    }
  }

  if (generation !== mapInitGeneration) return

  // 4. 降级/默认：初始化高德地图
  await initAMap()
}

// 初始化 Google Maps
const initGoogleMap = async (apiKey: string, generation: number) => {
  mapProviderType.value = 'google'
  const loader = new GoogleMapsLoader({
    apiKey,
    version: 'weekly',
    language: localeTag.value,
  })

  // 这会抛出异常，如由于网络、无代理引起等，正好会被上层捕捉
  const googleApi = await loader.importLibrary('maps')
  const { Map } = googleApi as google.maps.MapsLibrary

  // 加载可能用到的模块
  await loader.importLibrary('routes')
  await loader.importLibrary('marker')

  if (generation !== mapInitGeneration) return

  const container = document.getElementById('google-map-container')
  if (!container) throw new Error('Cannot find google-map-container')

  googleMap = new Map(container, {
    center: { lat: 39.916527, lng: 116.397128 },
    zoom: 12,
    mapTypeId: 'roadmap',
    // 隐藏默认控件，让其风格更接近我们的自定义风格
    disableDefaultUI: true,
    zoomControl: true,
    styles: [
      { elementType: 'geometry', stylers: [{ color: '#242f3e' }] },
      { elementType: 'labels.text.stroke', stylers: [{ color: '#242f3e' }] },
      { elementType: 'labels.text.fill', stylers: [{ color: '#746855' }] },
      { featureType: 'administrative.locality', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
      { featureType: 'poi', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
      { featureType: 'poi.park', elementType: 'geometry', stylers: [{ color: '#263c3f' }] },
      { featureType: 'poi.park', elementType: 'labels.text.fill', stylers: [{ color: '#6b9a76' }] },
      { featureType: 'road', elementType: 'geometry', stylers: [{ color: '#38414e' }] },
      { featureType: 'road', elementType: 'geometry.stroke', stylers: [{ color: '#212a37' }] },
      { featureType: 'road', elementType: 'labels.text.fill', stylers: [{ color: '#9ca5b3' }] },
      { featureType: 'road.highway', elementType: 'geometry', stylers: [{ color: '#746855' }] },
      { featureType: 'road.highway', elementType: 'geometry.stroke', stylers: [{ color: '#1f2835' }] },
      { featureType: 'road.highway', elementType: 'labels.text.fill', stylers: [{ color: '#f3d19c' }] },
      { featureType: 'transit', elementType: 'geometry', stylers: [{ color: '#2f3948' }] },
      { featureType: 'transit.station', elementType: 'labels.text.fill', stylers: [{ color: '#d59563' }] },
      { featureType: 'water', elementType: 'geometry', stylers: [{ color: '#17263c' }] },
      { featureType: 'water', elementType: 'labels.text.fill', stylers: [{ color: '#515c6d' }] },
      { featureType: 'water', elementType: 'labels.text.stroke', stylers: [{ color: '#17263c' }] },
    ],
  })

  // 添加景点标记
  await addGoogleAttractionMarkers(generation)

  if (generation !== mapInitGeneration) return

  message.success(t('result.messages.mapLoaded'))
}

// 添加 Google Maps 景点标记
const addGoogleAttractionMarkers = async (generation: number) => {
  if (!tripPlan.value || !googleMap) return

  const allAttractions: any[] = []
  let globalIndex = 0

  tripPlan.value.days.forEach((day, dayIndex) => {
    day.attractions.forEach((attraction, attrIndex) => {
      globalIndex++
      if (attraction.location && attraction.location.longitude && attraction.location.latitude) {
        allAttractions.push({
          ...attraction,
          dayIndex,
          attrIndex,
          globalIndex,
        })
      }
    })
  })

  const bounds = new google.maps.LatLngBounds()

  allAttractions.forEach((attraction, index) => {
    const position = { lat: attraction.location.latitude, lng: attraction.location.longitude }
    bounds.extend(position)

    // 这里如果想完全复用 DOM 较为复杂，我们可以直接采用原生的 google.maps.Marker 与自定义 icon
    // 用一个简单的 SVG data URI 画一个有数字的 icon
    const markerText = `${attraction.dayIndex + 1}-${attraction.attrIndex + 1}`
    const svgIcon = `data:image/svg+xml;charset=UTF-8,` + encodeURIComponent(`
      <svg xmlns="http://www.w3.org/2000/svg" width="34" height="42" viewBox="0 0 34 42">
        <path d="M17 0C7.6 0 0 7.6 0 17C0 29.8 17 42 17 42C17 42 34 29.8 34 17C34 7.6 26.4 0 17 0Z" fill="#ff5722" stroke="#fff" stroke-width="2"/>
        <text x="17" y="22" font-family="sans-serif" font-size="12" font-weight="bold" fill="white" text-anchor="middle">${markerText}</text>
      </svg>
    `)

    const marker = new google.maps.Marker({
      position,
      map: googleMap,
      icon: {
        url: svgIcon,
        scaledSize: new google.maps.Size(34, 42),
        anchor: new google.maps.Point(17, 42),
      },
      zIndex: 120 + index
    })

    const infoWindow = new google.maps.InfoWindow({
      content: buildInfoWindowContent(attraction),
      disableAutoPan: true,
    })

    marker.addListener('mouseover', () => { infoWindow.open({ anchor: marker, map: googleMap }) })
    marker.addListener('mouseout', () => { infoWindow.close() })
    marker.addListener('click', () => { infoWindow.open({ anchor: marker, map: googleMap }) })

    googleMarkers.push(marker)
    googleInfoWindows.push(infoWindow)
  })

  // 绘制 Google Maps 路线
  if (generation !== mapInitGeneration) return
  await drawGoogleRoutes(allAttractions)

  if (generation !== mapInitGeneration) return

  if (allAttractions.length > 0 && googleMap) {
    googleMap.fitBounds(bounds)
    // 防止过于放大
    const currentZoom = googleMap.getZoom()
    if (currentZoom && currentZoom > 15) googleMap.setZoom(15)
  }
}

// 绘制 Google Maps 路线
const drawGoogleRoutes = async (attractions: any[]) => {
  if (attractions.length < 2 || !tripPlan.value || !googleMap) return

  const dayGroups: Record<number, any[]> = {}
  attractions.forEach(attr => {
    if (!dayGroups[attr.dayIndex]) dayGroups[attr.dayIndex] = []
    dayGroups[attr.dayIndex].push(attr)
  })

  const directionsService = new google.maps.DirectionsService()

  for (const dayAttractions of Object.values(dayGroups)) {
    if (dayAttractions.length < 2) continue

    dayAttractions.sort((a: any, b: any) => a.attrIndex - b.attrIndex)
    const dayIndex = dayAttractions[0].dayIndex
    const transportation = tripPlan.value.days?.[dayIndex]?.transportation || ''
    const preferredMode = detectRouteMode(transportation)

    let gTravelMode = google.maps.TravelMode.DRIVING
    if (preferredMode === 'walking') gTravelMode = google.maps.TravelMode.WALKING

    for (let i = 0; i < dayAttractions.length - 1; i++) {
      const start = dayAttractions[i]
      const end = dayAttractions[i + 1]
      const origin = { lat: start.location.latitude, lng: start.location.longitude }
      const destination = { lat: end.location.latitude, lng: end.location.longitude }

      if (preferredMode === 'straight') {
        const poly = new google.maps.Polyline({
          path: [origin, destination],
          strokeColor: '#ffffff',
          strokeWeight: 1.5,
          strokeOpacity: 0.62,
          map: googleMap,
          zIndex: 90,
        })
        googlePolylines.push(poly)
        continue
      }

      try {
        const response = await directionsService.route({
          origin,
          destination,
          travelMode: gTravelMode,
        })

        const renderer = new google.maps.DirectionsRenderer({
          map: googleMap,
          directions: response,
          suppressMarkers: true, // 我们已经有了自定义 Marker
          polylineOptions: {
            strokeColor: preferredMode === 'walking' ? '#6ad38f' : '#37b4ff',
            strokeWeight: preferredMode === 'walking' ? 3 : 3.5,
            zIndex: 90,
          }
        })
        googleDirectionsRenderers.push(renderer)
      } catch (err: any) {
        console.warn('Google 路线规划失败, 降级为直线:', err)
        const poly = new google.maps.Polyline({
          path: [origin, destination],
          strokeColor: '#ffffff',
          strokeWeight: 1.5,
          strokeOpacity: 0.62,
          map: googleMap,
          zIndex: 90,
        })
        googlePolylines.push(poly)
      }
    }
  }
}

// 初始化高德地图
const initAMap = async () => {
  try {
    mapProviderType.value = 'amap'
    const mapJsKey = getRuntimeMapJsKey()
    if (!mapJsKey) {
      message.warning('请先在设置中配置高德地图 JS Key')
      return
    }
    const AMap = await AMapLoader.load({
      key: mapJsKey,  // 高德地图Web端(JS API) Key
      version: '2.0',
      plugins: ['AMap.Marker', 'AMap.Polyline', 'AMap.InfoWindow', 'AMap.Driving', 'AMap.Walking']
    })

    // 创建地图实例
    map = new AMap.Map('amap-container', {
      zoom: 12,
      center: [116.397128, 39.916527], // 默认中心点(北京)
      viewMode: '3D',
      mapStyle: 'amap://styles/darkblue',
      // 开启 preserveDrawingBuffer 保留 WebGL 画布内容（供画布回读/截图）
      WebGLParams: {
        preserveDrawingBuffer: true
      }
    })

    // 添加景点标记
    await addAttractionMarkers(AMap)

    message.success(t('result.messages.mapLoaded'))
  } catch (error) {
    console.error('地图加载失败:', error)
    message.error(t('result.messages.mapLoadFailed'))
  }
}

// 添加地图点位（路书同款：景点/餐饮/住宿三类标记，点击只显示「名称 + 到这里去」）
const addAttractionMarkers = async (AMap: any) => {
  if (!tripPlan.value) return

  const points = collectMapPoints(tripPlan.value)
  if (!points.length) return

  const colors: Record<string, string> = { attraction: '#17365d', meal: '#ea580c', hotel: '#7c3aed' }
  const markers: any[] = []
  const labels: any[] = []

  points.forEach((p, index) => {
    const content =
      p.type === 'attraction'
        ? `<div class="tripxu-map-dot" style="background:${colors.attraction}">${p.day}-${p.order}</div>`
        : `<div class="tripxu-map-dot" style="background:${colors[p.type]}">${p.type === 'meal' ? '🍜' : '🏨'}</div>`
    const marker = new AMap.Marker({
      position: [p.lng, p.lat],
      content,
      anchor: 'center',
      zIndex: 120 + index,
    })
    const infoWindow = new AMap.InfoWindow({
      isCustom: true,
      content: buildMapNavInfoWindow(p),
      offset: new AMap.Pixel(0, -18),
      closeWhenClickMap: true,
    })
    marker.on('click', () => {
      infoWindow.open(map, marker.getPosition())
    })
    markers.push(marker)

    labels.push(
      new AMap.Text({
        text: p.textName,
        position: [p.lng, p.lat],
        offset: new AMap.Pixel(14, -10),
        style: {
          background: 'rgba(10, 20, 28, 0.88)',
          border: '1px solid rgba(215, 110, 66, 0.4)',
          'border-radius': '5px',
          padding: '1px 7px',
          'font-size': '11px',
          color: '#f6fbff',
          'white-space': 'nowrap',
        },
      })
    )
  })

  map.add(markers)
  mapLabelOverlays = labels
  if (mapLabelsShown.value) map.add(labels)
  map.setFitView(markers)
}

// InfoWindow：只显示名称 + 「到这里去」导航（深链 + Web 兜底，与路书一致）
const buildMapNavInfoWindow = (p: { name: string; textName: string; lng: number; lat: number }): string => {
  const nav = `amapuri://route/plan/?dlat=${p.lat}&dlon=${p.lng}&dname=${encodeURIComponent(p.textName)}&dev=0&t=0`
  const web = `https://uri.amap.com/navigation?to=${p.lng},${p.lat},${encodeURIComponent(p.textName)}&mode=car&coordinate=gaode`
  return `<div class="tripxu-map-iw"><div class="tripxu-map-iw-title">${p.name}</div><a class="tripxu-map-iw-nav" href="${nav}" data-web="${web}">${t('result.roadbook.goHere')}</a></div>`
}

// 「显示全部名称」开关（路书同款交互）
const toggleMapLabels = () => {
  if (!map || !mapLabelOverlays.length) return
  mapLabelsShown.value = !mapLabelsShown.value
  if (mapLabelsShown.value) map.add(mapLabelOverlays)
  else map.remove(mapLabelOverlays)
}

</script>

<style scoped>
@import 'swiper/css';

/* ===== Landing 同款视觉基底 - 结果页 ===== */

.result-container {
  min-height: 100vh;
  background: linear-gradient(180deg, #0d171d 0%, #142430 58%, #0f1a22 100%);
  color: #ecf3fa;
  position: relative;
  isolation: isolate;
  overflow-x: hidden;
}

.lower-shade {
  position: fixed;
  inset: 0% 0 -1px 0;
  z-index: 0;
  pointer-events: none;
  background: rgba(6, 14, 20, 0.72);
}

.lower-shade::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: -28px;
  height: 28px;
  background: linear-gradient(to bottom, rgba(6, 14, 20, 0), rgba(6, 14, 20, 0.92));
}

.result-main {
  position: relative;
  z-index: 2;
  padding: 70px 20px 44px;
}

.content-wrapper {
  max-width: 1400px;
  margin: 0 auto;
  display: block;
  border: 1.2px solid rgba(236, 243, 250, 0.2);
  border-radius: 22px;
  background: rgba(12, 23, 32, 0.56);
  backdrop-filter: blur(18px);
  box-shadow: 0 24px 80px rgba(4, 11, 18, 0.52);
  padding: 20px;
}

.top-switch-nav {
  display: flex;
  align-items: center;
  gap: 12px;
  justify-content: space-between;
  margin-bottom: 16px;
}

.top-switch-menu-wrap {
  flex: 1;
  min-width: 0;
  overflow-x: hidden;
  overflow-y: hidden;
}

.top-switch-menu {
  width: 100%;
  min-width: 0;
  border-bottom: 1px solid rgba(236, 243, 250, 0.16) !important;
  background: transparent !important;
}

.top-switch-menu :deep(.ant-menu-item) {
  color: rgba(232, 239, 247, 0.75) !important;
  border-radius: 10px 10px 0 0;
  margin-right: 4px !important;
  transition: all 0.2s ease;
}

.top-switch-menu :deep(.ant-menu-item:hover) {
  color: rgba(236, 243, 250, 0.95) !important;
}

.top-switch-menu :deep(.ant-menu-item-selected) {
  color: #ffe3d6 !important;
}

.top-switch-menu :deep(.ant-menu-item-selected::after),
.top-switch-menu :deep(.ant-menu-item-active::after),
.top-switch-menu :deep(.ant-menu-item:hover::after) {
  border-bottom-color: #d76e42 !important;
}

.top-switch-menu :deep(.ant-menu-overflow) {
  flex-wrap: nowrap;
}

.top-switch-actions {
  flex: 0 0 auto;
  display: flex;
  align-items: center;
}

.top-switch-actions :deep(.ant-btn-default) {
  border: 1.2px solid rgba(236, 243, 250, 0.24) !important;
  background: rgba(12, 23, 32, 0.56) !important;
  color: #ecf3fa !important;
  border-radius: 999px !important;
  height: 34px !important;
  padding: 0 12px !important;
  font-size: 12px !important;
  font-weight: 600;
  letter-spacing: 0.04em;
}

.top-switch-actions :deep(.ant-btn-primary) {
  border: 1.2px solid rgba(215, 110, 66, 0.5) !important;
  background: rgba(215, 110, 66, 0.24) !important;
  color: #ffe3d6 !important;
  border-radius: 999px !important;
  height: 34px !important;
  padding: 0 12px !important;
  font-size: 12px !important;
  font-weight: 600;
  letter-spacing: 0.04em;
  box-shadow: none !important;
}

.empty-state-panel {
  max-width: 900px;
  margin: 0 auto;
  border: 1.2px solid rgba(236, 243, 250, 0.2);
  border-radius: 22px;
  background: rgba(12, 23, 32, 0.56);
  backdrop-filter: blur(18px);
  box-shadow: 0 24px 80px rgba(4, 11, 18, 0.52);
  padding: 44px 20px;
  text-align: center;
}

.empty-desc {
  color: rgba(228, 236, 245, 0.72);
}

.empty-back-btn {
  border: 1.2px solid rgba(215, 110, 66, 0.5) !important;
  background: rgba(215, 110, 66, 0.24) !important;
  color: #ffe3d6 !important;
  border-radius: 999px !important;
  min-height: 34px !important;
  padding: 0 14px !important;
  font-size: 12px !important;
  font-weight: 600;
  letter-spacing: 0.04em;
  box-shadow: none !important;
}

/* 景点图片样式 */
.attraction-image-wrapper {
  position: relative;
  margin-bottom: 12px;
  border-radius: 12px;
  overflow: hidden;
}

.attraction-image {
  width: 100%;
  height: 200px;
  object-fit: cover;
  transition: transform 0.4s ease;
}

.attraction-image-wrapper:hover .attraction-image {
  transform: scale(1.08);
}

.attraction-badge {
  position: absolute;
  top: 12px;
  left: 12px;
  background: linear-gradient(135deg, #d76e42 0%, #a14625 100%);
  color: white;
  width: 36px;
  height: 36px;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: bold;
  box-shadow: 0 4px 12px rgba(215, 110, 66, 0.35);
}

.badge-number {
  font-size: 18px;
}

.price-tag {
  position: absolute;
  top: 12px;
  right: 12px;
  background: rgba(215, 110, 66, 0.9);
  color: white;
  padding: 4px 14px;
  border-radius: 20px;
  font-weight: bold;
  font-size: 14px;
  box-shadow: 0 4px 12px rgba(215, 110, 66, 0.3);
  backdrop-filter: blur(10px);
}

.price-tag-free {
  background: rgba(21, 128, 61, 0.9);
  box-shadow: 0 4px 12px rgba(21, 128, 61, 0.3);
}

/* 预约提醒样式 */
.reservation-alert {
  margin-top: 10px;
  padding: 8px 12px;
  background: linear-gradient(135deg, rgba(255, 152, 0, 0.12) 0%, rgba(255, 87, 34, 0.08) 100%);
  border: 1px solid rgba(255, 152, 0, 0.35);
  border-radius: 8px;
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.reservation-badge {
  font-size: 13px;
  font-weight: 700;
  color: #ff9800;
}

.reservation-tips {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.72);
  line-height: 1.5;
}

/* 天气看板样式 */
.weather-section-card {
  /* margin-top: 14px; */
  overflow: hidden;
}

.weather-dashboard {
  display: flex;
  height: 350px;
  /* border-radius: 24px; */
  overflow: hidden;
  /* border: 1px solid rgba(255, 255, 255, 0.14); */
  background: none;
}

.weather-side {
  position: relative;
  flex: 0 0 300px;
  /* min-height: 360px; */
  /* border-radius: 26px; */
  overflow: hidden;
  box-shadow: 0 0 20px -8px rgba(0, 0, 0, 0.36);
  transition: transform 300ms ease;
  transform: translateZ(0) scale(1.02) perspective(1200px);
}

.weather-side:hover {
  transform: scale(1.06) perspective(1400px) rotateY(6deg);
}

.weather-gradient {
  position: absolute;
  inset: 0;
  background-image: linear-gradient(140deg, #72edf2 0%, #5151e5 100%);
  opacity: 0.84;
}

.date-container {
  position: absolute;
  top: 38px;
  left: 38px;
  right: 28px;
  z-index: 2;
}

.date-dayname {
  margin: 0;
  font-size: 26px;
  line-height: 1.12;
  font-weight: 700;
  color: rgba(255, 255, 255, 0.96);
}

.date-day {
  display: block;
  margin-top: 4px;
  font-size: 13px;
  letter-spacing: 0.03em;
  color: rgba(240, 247, 255, 0.84);
}

.location {
  display: inline-flex;
  align-items: center;
  margin-top: 8px;
  font-size: 16px;
  font-weight: bold;
  color: rgba(242, 248, 255, 0.9);
}

.location-icon {
  margin-right: 6px;
}

.weather-container {
  position: absolute;
  left: 28px;
  right: 28px;
  bottom: 28px;
  z-index: 2;
}

.weather-hero-icon {
  display: inline-block;
  color: #f7fbff;
  font-size: 0.78em;
  line-height: 1;
  margin-bottom: -22px;
  margin-left: -20px;
  filter: drop-shadow(0 8px 14px rgba(0, 0, 0, 0.18));
}

.weather-icon {
  position: relative;
  display: inline-block;
  width: 12em;
  height: 10em;
  animation: weather-float 5.5s ease-in-out infinite;
}

.weather-icon .cloud {
  position: absolute;
  z-index: 1;
  top: 50%;
  left: 50%;
  width: 3.6875em;
  height: 3.6875em;
  margin: -1.84375em;
  background: currentColor;
  border-radius: 50%;
  box-shadow:
    -2.1875em 0.6875em 0 -0.6875em,
    2.0625em 0.9375em 0 -0.9375em,
    0 0 0 0.375em #fff,
    -2.1875em 0.6875em 0 -0.3125em #fff,
    2.0625em 0.9375em 0 -0.5625em #fff;
}

.weather-icon .cloud:after {
  content: '';
  position: absolute;
  bottom: 0;
  left: -0.5em;
  display: block;
  width: 4.5625em;
  height: 1em;
  background: currentColor;
  box-shadow: 0 0.4375em 0 -0.0625em #fff;
}

.weather-icon .cloud:nth-child(2) {
  z-index: 0;
  background: #fff;
  box-shadow:
    -2.1875em 0.6875em 0 -0.6875em #fff,
    2.0625em 0.9375em 0 -0.9375em #fff,
    0 0 0 0.375em #fff,
    -2.1875em 0.6875em 0 -0.3125em #fff,
    2.0625em 0.9375em 0 -0.5625em #fff;
  opacity: 0.3;
  transform: scale(0.5) translate(6em, -3em);
  animation: weather-cloud 4s linear infinite;
}

.weather-icon .cloud:nth-child(2):after {
  background: #fff;
}

.weather-icon .sun {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 2.5em;
  height: 2.5em;
  margin: -1.25em;
  background: currentColor;
  border-radius: 50%;
  box-shadow: 0 0 0 0.375em #fff;
  animation: weather-spin 12s infinite linear;
}

.weather-icon .rays {
  position: absolute;
  top: -2em;
  left: 50%;
  display: block;
  width: 0.375em;
  height: 1.125em;
  margin-left: -0.1875em;
  background: #fff;
  border-radius: 0.25em;
  box-shadow: 0 5.375em #fff;
}

.weather-icon .rays:before,
.weather-icon .rays:after {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  display: block;
  width: 0.375em;
  height: 1.125em;
  transform: rotate(60deg);
  transform-origin: 50% 3.25em;
  background: #fff;
  border-radius: 0.25em;
  box-shadow: 0 5.375em #fff;
}

.weather-icon .rays:before {
  transform: rotate(120deg);
}

.weather-icon .cloud + .sun {
  margin: -2em 1em;
}

.weather-icon .rain,
.weather-icon .lightning,
.weather-icon .snow {
  position: absolute;
  z-index: 2;
  top: 50%;
  left: 50%;
  width: 3.75em;
  height: 3.75em;
  margin: 0.375em 0 0 -2em;
  background: transparent;
}

.weather-icon .rain:after {
  content: '';
  position: absolute;
  z-index: 2;
  top: 50%;
  left: 50%;
  width: 1.125em;
  height: 1.125em;
  margin: -1em 0 0 -0.25em;
  background: #0cf;
  border-radius: 100% 0 60% 50% / 60% 0 100% 50%;
  box-shadow:
    0.625em 0.875em 0 -0.125em rgba(255, 255, 255, 0.2),
    -0.875em 1.125em 0 -0.125em rgba(255, 255, 255, 0.2),
    -1.375em -0.125em 0 rgba(255, 255, 255, 0.2);
  transform: rotate(-28deg);
  animation: weather-rain 3s linear infinite;
}

.weather-icon .bolt {
  position: absolute;
  top: 50%;
  left: 50%;
  margin: -0.25em 0 0 -0.125em;
  color: #fff;
  opacity: 0.3;
  animation: weather-lightning 2s linear infinite;
}

.weather-icon .bolt:nth-child(2) {
  width: 0.5em;
  height: 0.25em;
  margin: -1.75em 0 0 -1.875em;
  transform: translate(2.5em, 2.25em);
  opacity: 0.2;
  animation: weather-lightning 1.5s linear infinite;
}

.weather-icon .bolt:before,
.weather-icon .bolt:after {
  content: '';
  position: absolute;
  z-index: 2;
  top: 50%;
  left: 50%;
  margin: -1.625em 0 0 -1.0125em;
  border-top: 1.25em solid transparent;
  border-right: 0.75em solid;
  border-bottom: 0.75em solid;
  border-left: 0.5em solid transparent;
  transform: skewX(-10deg);
}

.weather-icon .bolt:after {
  margin: -0.25em 0 0 -0.25em;
  border-top: 0.75em solid;
  border-right: 0.5em solid transparent;
  border-bottom: 1.25em solid transparent;
  border-left: 0.75em solid;
  transform: skewX(-10deg);
}

.weather-icon .bolt:nth-child(2):before {
  margin: -0.75em 0 0 -0.5em;
  border-top: 0.625em solid transparent;
  border-right: 0.375em solid;
  border-bottom: 0.375em solid;
  border-left: 0.25em solid transparent;
}

.weather-icon .bolt:nth-child(2):after {
  margin: -0.125em 0 0 -0.125em;
  border-top: 0.375em solid;
  border-right: 0.25em solid transparent;
  border-bottom: 0.625em solid transparent;
  border-left: 0.375em solid;
}

.weather-icon .flake:before,
.weather-icon .flake:after {
  content: '\2744';
  position: absolute;
  top: 50%;
  left: 50%;
  margin: -1.025em 0 0 -1.0125em;
  color: #fff;
  line-height: 1em;
  opacity: 0.2;
  animation: weather-spin 8s linear infinite reverse;
}

.weather-icon .flake:after {
  margin: 0.125em 0 0 -1em;
  font-size: 1.5em;
  opacity: 0.4;
  animation: weather-spin 14s linear infinite;
}

.weather-icon .flake:nth-child(2):before {
  margin: -0.5em 0 0 0.25em;
  font-size: 1.25em;
  opacity: 0.2;
  animation: weather-spin 10s linear infinite;
}

.weather-icon .flake:nth-child(2):after {
  margin: 0.375em 0 0 0.125em;
  font-size: 2em;
  opacity: 0.4;
  animation: weather-spin 16s linear infinite reverse;
}

.weather-temp {
  margin: 8px 0 0;
  font-size: 56px;
  line-height: 0.95;
  font-weight: 800;
  color: #fff;
  letter-spacing: -0.02em;
}

.weather-desc {
  margin: 8px 0 0;
  font-size: 20px;
  color: rgba(245, 249, 255, 0.94);
  font-weight: 600;
}

.weather-info-side {
  flex: 1;
  min-width: 0;
  padding: 16px 30px;
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.today-info-container {
  /* border-radius: 14px; */
  /* border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.02); */
}

.today-info {
  padding: 10px 12px;
}

.today-info-item {
  display: flex;
  align-items: baseline;
  justify-content: space-between;
  gap: 8px;
  font-size: 12px;
  line-height: 1.3;
}

.today-info-item + .today-info-item {
  margin-top: 6px;
  padding-top: 6px;
  /* border-top: 1px solid rgba(255, 255, 255, 0.08); */
}

.today-info-item .wea-title {
  color: rgba(235, 243, 252, 0.809);
  letter-spacing: 0.04em;
  text-transform: uppercase;
  font-size: 17px;
  font-weight: 600;
  padding: 3px 0;
}

.today-info-item .value {
  color: rgba(255, 255, 255, 0.9);
  text-align: right;
  font-size: 16px;
}

.week-container {
  margin-top: 0;
  padding-top: 0;
}

.week-container--top {
  margin-bottom: 2px;
}

.week-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.week-list > li {
  width: 86px;
  padding: 8px 8px;
  border-radius: 12px;
  cursor: pointer;
  transition: transform 0.2s ease, box-shadow 0.2s ease, background-color 0.2s ease, color 0.2s ease;
  border: 1px solid rgba(255, 255, 255, 0.1);
  background: rgba(255, 255, 255, 0.03);
  color: rgba(238, 245, 253, 0.78);
}

.week-list > li:hover {
  transform: translateY(-3px);
  background: rgba(255, 255, 255, 0.12);
  color: rgba(5, 12, 20, 0.9);
  box-shadow: 0 10px 28px rgba(9, 15, 22, 0.32);
}

.week-list > li.active {
  background: rgba(255, 255, 255, 0.9);
  color: rgba(9, 14, 24, 0.92);
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.22);
}

.week-list > li .day-icon {
  display: block;
  margin: 0 auto;
}

.week-list > li .day-icon.weather-icon--small {
  width: 12em;
  height: 10em;
  font-size: 0.3em;
  color: inherit;
  animation-duration: 6.2s;
}

.week-list > li .day-name {
  display: block;
  margin-top: 6px;
  text-align: center;
  font-size: 12px;
  letter-spacing: 0.03em;
}

.week-list > li .day-temp {
  display: block;
  text-align: center;
  margin-top: 3px;
  font-weight: 700;
  font-size: 12px;
}

@keyframes weather-spin {
  100% {
    transform: rotate(360deg);
  }
}

@keyframes weather-float {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(-2px);
  }
}

@keyframes weather-cloud {
  0% {
    opacity: 0;
  }

  50% {
    opacity: 0.3;
  }

  100% {
    opacity: 0;
    transform: scale(0.5) translate(-200%, -3em);
  }
}

@keyframes weather-rain {
  0% {
    background: #0cf;
    box-shadow:
      0.625em 0.875em 0 -0.125em rgba(255, 255, 255, 0.2),
      -0.875em 1.125em 0 -0.125em rgba(255, 255, 255, 0.2),
      -1.375em -0.125em 0 #0cf;
  }

  25% {
    box-shadow:
      0.625em 0.875em 0 -0.125em rgba(255, 255, 255, 0.2),
      -0.875em 1.125em 0 -0.125em #0cf,
      -1.375em -0.125em 0 rgba(255, 255, 255, 0.2);
  }

  50% {
    background: rgba(255, 255, 255, 0.3);
    box-shadow:
      0.625em 0.875em 0 -0.125em #0cf,
      -0.875em 1.125em 0 -0.125em rgba(255, 255, 255, 0.2),
      -1.375em -0.125em 0 rgba(255, 255, 255, 0.2);
  }

  100% {
    box-shadow:
      0.625em 0.875em 0 -0.125em rgba(255, 255, 255, 0.2),
      -0.875em 1.125em 0 -0.125em rgba(255, 255, 255, 0.2),
      -1.375em -0.125em 0 #0cf;
  }
}

@keyframes weather-lightning {
  45% {
    color: #fff;
    background: #fff;
    opacity: 0.2;
  }

  50% {
    color: #0cf;
    background: #0cf;
    opacity: 1;
  }

  55% {
    color: #fff;
    background: #fff;
    opacity: 0.2;
  }
}

/* 回到顶部按钮 */
.back-top-button {
  width: 50px;
  height: 50px;
  background: linear-gradient(135deg, #d76e42 0%, #a14625 100%);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 13px;
  font-weight: 700;
  letter-spacing: 0.03em;
  box-shadow: 0 4px 20px rgba(215, 110, 66, 0.38);
  cursor: pointer;
  transition: all 0.3s ease;
}

.back-top-button:hover {
  transform: scale(1.15);
  box-shadow: 0 6px 28px rgba(215, 110, 66, 0.48);
}

/* 酒店卡片样式 */
.hotel-card {
  background: rgba(215, 110, 66, 0.1) !important;
  border: 1px solid rgba(215, 110, 66, 0.26) !important;
}

.hotel-card :deep(.ant-card-head) {
  background: linear-gradient(135deg, rgba(215, 110, 66, 0.9) 0%, rgba(161, 70, 37, 0.9) 100%) !important;
}

.hotel-title {
  color: white !important;
  font-weight: 600;
}

.hotel-card :deep(.ant-descriptions-item-label) {
  color: rgba(255, 255, 255, 0.5) !important;
}

.hotel-card :deep(.ant-descriptions-item-content) {
  color: rgba(255, 255, 255, 0.8) !important;
}

/* 顶部信息区布局 */
.top-info-section {
  display: flex;
  gap: 20px;
  margin-bottom: 20px;
}

.left-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.right-map {
  flex: 1;
}

/* 行程概览卡片 */
.overview-card {
  margin-bottom: 20px;
}

.section-shellless {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
}

.section-shellless:hover {
  box-shadow: none !important;
  border-color: transparent !important;
}

:deep(.section-shellless > .ant-card-head) {
  display: none !important;
}

:deep(.section-shellless > .ant-card-body) {
  padding: 0 !important;
  background: rgba(3, 8, 13, 0.726);
  border-radius: 14px;
}

.overview-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 18px;
}

.overview-meta-item {
  display: inline-flex;
  align-items: center;
  padding: 3px 12px;
  /* border-radius: 999px;
  border: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.04); */
  color: rgba(236, 243, 250, 0.78);
  font-size: 12px;
  line-height: 1.5;
}

.overview-swiper {
  padding: 8px 2px 10px;
}

.overview-swiper .swiper {
  padding: 0 0 0.6rem;
  margin-top: -2rem;
  margin-bottom: -2rem;
  overflow: hidden;
  border-radius: 12px;
}

.overview-swiper .swiper-wrapper {
  align-items: flex-end;
  min-height: 32rem;
}


/* 预算卡片 */
.budget-card {
  height: fit-content;
}

.budget-detail-panel {
  min-height: 100%;
  border-radius: 14px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  background: rgba(3, 10, 15, 0.88);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.budget-toolbar {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  padding-bottom: 10px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
}

.budget-toolbar-item {
  display: flex;
  align-items: center;
  gap: 8px;
}

.budget-toolbar-label {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.72);
  letter-spacing: 0.04em;
  text-transform: uppercase;
}

.budget-select {
  width: 180px;
}

.budget-select :deep(.ant-select-selector) {
  border-radius: 10px !important;
  border-color: rgba(255, 255, 255, 0.24) !important;
  background: rgba(0, 0, 0, 0.2) !important;
  color: rgba(255, 255, 255, 0.86) !important;
}

.budget-select :deep(.ant-select-arrow) {
  color: rgba(255, 255, 255, 0.72) !important;
}

.budget-detail-list {
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 12px;
  overflow: hidden;
  background: rgba(0, 0, 0, 0.18);
}

.budget-detail-row {
  display: grid;
  /* 固定列收窄（类型/天数/金额/操作），把宽度尽量让给项目名称列 */
  grid-template-columns: 64px 62px minmax(0, 1fr) 78px 62px;
  align-items: center;
  gap: 8px;
  padding: 11px 12px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  background: rgba(255, 255, 255, 0.01);
}

.budget-detail-row:last-child {
  border-bottom: none;
}

.budget-detail-header {
  background: rgba(255, 255, 255, 0.04);
  font-size: 12px;
  color: rgba(255, 255, 255, 0.64);
  letter-spacing: 0.03em;
  text-transform: uppercase;
}

.budget-detail-type,
.budget-detail-day,
.budget-detail-name,
.budget-detail-amount {
  color: rgba(255, 255, 255, 0.86);
  font-size: 13px;
}

.budget-detail-name {
  /* 最多显示两行，超出省略（不追求 100% 展示，但保证大部分可读） */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
  line-height: 1.4;
}

.budget-detail-amount {
  font-weight: 600;
  color: #ffd5c6;
}

.budget-action-wrap {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.budget-icon-btn {
  width: 22px;
  height: 22px;
  border: none;
  background: transparent;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
}

.budget-icon-btn svg {
  width: 16px;
  height: 16px;
}

.budget-edit-btn {
  color: rgba(255, 255, 255, 0.68);
}

.budget-delete-btn {
  color: rgba(255, 255, 255, 0.68);
}

.budget-edit-btn:hover,
.budget-delete-btn:hover {
  color: #fff;
  transform: scale(1.1);
  /* background: rgba(110, 247, 213, 0.16); */
}

.right-budget-summary {
  flex: 0 0 360px;
}

.budget-summary-panel {
  min-height: 100%;
  border-radius: 14px;
  border: 1.2px solid rgba(255, 255, 255, 0.14);
  background: rgba(3, 10, 15, 0.88);
  padding: 18px;
  display: flex;
  flex-direction: column;
  gap: 18px;
}

.budget-summary-title {
  color: rgba(255, 255, 255, 0.92);
  font-size: 34px;
  font-weight: 300;
  letter-spacing: 0.02em;
  line-height: 1;
}

.budget-summary-total-wrap {
  display: flex;
  align-items: flex-start;
  gap: 4px;
}

.budget-summary-currency {
  font-size: 42px;
  line-height: 1;
  color: rgba(255, 255, 255, 0.9);
}

.budget-summary-total-value {
  font-size: 78px;
  line-height: 0.88;
  font-weight: 300;
  color: rgba(255, 255, 255, 0.96);
  letter-spacing: 0.01em;
}

.budget-summary-sub-grid {
  margin-top: 6px;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px 12px;
}

.budget-summary-sub-item {
  border-top: 1px solid rgba(255, 255, 255, 0.1);
  padding-top: 8px;
}

.budget-summary-sub-value {
  font-size: 32px;
  line-height: 1;
  color: #ffd4c3;
}

.budget-summary-sub-label {
  margin-top: 6px;
  font-size: 12px;
  line-height: 1.4;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.65);
  text-transform: uppercase;
}

.budget-pending-wrap {
  margin-top: 4px;
  padding-top: 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.budget-pending-title {
  font-size: 12px;
  letter-spacing: 0.04em;
  color: rgba(255, 255, 255, 0.72);
  margin-bottom: 8px;
  text-transform: uppercase;
}

.budget-pending-empty {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.45);
  padding: 8px 0;
}

.budget-pending-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.budget-pending-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  padding: 8px 10px;
  border-radius: 10px;
  background: rgba(255, 255, 255, 0.04);
  border: 1px solid rgba(255, 255, 255, 0.09);
}

.budget-pending-name {
  flex: 1;
  min-width: 0;
  color: rgba(255, 255, 255, 0.84);
  font-size: 13px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.budget-restore-btn {
  padding: 0 !important;
}

/* 地图卡片 */
/* 注意：这里必须给 .map-card 一个确定高度。
   之前是 height:100% + min-height:500px，百分比高度无法从 min-height 解析，
   导致 .ant-card-body 高度为 auto、#amap-container 实际高度 0，
   AMap 2.0 在 0 高度容器上 add() overlay 会抛 `Invalid Object: Pixel(NaN, NaN)`，
   表现为"只剩底图、景点标记全部丢失"。 */
.map-card {
  height: 500px;
  min-height: 500px;
  overflow: hidden;
  position: relative;
}

.map-card :deep(.ant-card-body) {
  height: 100%;
  padding: 0;
}

/* 知识图谱卡片 */
.kg-card {
  margin-top: 20px;
}

.kg-card :deep(.ant-card-body) {
  padding: 0 0 16px 0;
}

.kg-legend {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 16px;
  padding: 12px 20px 12px;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
  background: rgba(6, 8, 14, 0.86);
  border-radius: 0 0 16px 16px;
}

.kg-legend-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: rgba(255, 255, 255, 0.6);
}

.kg-legend-dot {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  display: inline-block;
  background-position: center;
  background-size: contain;
  background-repeat: no-repeat;
}

/* 每日行程卡片 */
.days-card {
  margin-top: 20px;
}

.day-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.day-title {
  font-size: 18px;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.85);
}

.day-date {
  font-size: 14px;
  color: rgba(255, 255, 255, 0.35);
  margin-left: auto;
}

.day-city-tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 6px;
  background: rgba(90, 216, 166, 0.15);
  border: 1px solid rgba(90, 216, 166, 0.3);
  color: #5ad8a6;
  font-size: 12px;
  font-weight: 600;
  margin-left: 10px;
}

.day-transfer-tag {
  display: inline-block;
  padding: 2px 10px;
  border-radius: 6px;
  background: rgba(246, 189, 22, 0.15);
  border: 1px solid rgba(246, 189, 22, 0.35);
  color: #f6bd16;
  font-size: 12px;
  font-weight: 600;
  margin-left: 6px;
}

.transfer-info-banner {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 10px 14px;
  margin-bottom: 14px;
  border-radius: 10px;
  background: rgba(246, 189, 22, 0.08);
  border: 1px solid rgba(246, 189, 22, 0.2);
  font-size: 13px;
  color: rgba(255, 255, 255, 0.78);
}

.transfer-info-icon {
  font-size: 18px;
}

.transfer-info-label {
  font-weight: 600;
  color: #f6bd16;
}

.day-info {
  margin-bottom: 20px;
  padding: 16px;
  background: rgba(255, 255, 255, 0.04);
  border-radius: 12px;
  border: 1px solid rgba(255, 255, 255, 0.06);
}

.info-row {
  display: flex;
  gap: 12px;
  margin-bottom: 8px;
}

.info-row:last-child {
  margin-bottom: 0;
}

.info-row .label {
  font-weight: 600;
  color: rgba(255, 255, 255, 0.45);
  min-width: 100px;
}

.info-row .value {
  color: rgba(255, 255, 255, 0.8);
  flex: 1;
}

/* 卡片样式 - 玻璃拟态暗色 */
:deep(.ant-card) {
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.04) !important;
  backdrop-filter: blur(20px);
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
  margin-bottom: 20px;
  transition: all 0.3s ease;
  animation: fadeInUp 0.6s ease-out;
  color: rgba(255, 255, 255, 0.8);
}

:deep(.ant-card:hover) {
  box-shadow: 0 12px 40px rgba(0, 0, 0, 0.4);
  border-color: rgba(215, 110, 66, 0.26) !important;
}

:deep(.ant-card-head) {
  background: linear-gradient(135deg, rgba(215, 110, 66, 0.2) 0%, rgba(161, 70, 37, 0.14) 100%) !important;
  color: #ffe3d6 !important;
  border-radius: 16px 16px 0 0;
  font-weight: 600;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06) !important;
}

:deep(.ant-card-head-title) {
  color: #ffe3d6 !important;
  font-size: 18px;
}

:deep(.ant-card-head-title span) {
  color: #ffe3d6 !important;
}

:deep(.ant-card-body) {
  color: rgba(255, 255, 255, 0.8);
}

:deep(.ant-card-body p) {
  color: rgba(255, 255, 255, 0.7);
}

:deep(.ant-card-body strong) {
  color: rgba(255, 255, 255, 0.5);
}

/* Collapse 样式 - 暗色 */
:deep(.ant-collapse) {
  border: none;
  background: transparent;
}

:deep(.ant-collapse-item) {
  margin-bottom: 16px;
  border: 1px solid rgba(255, 255, 255, 0.08) !important;
  border-radius: 16px !important;
  overflow: hidden;
  background: rgba(255, 255, 255, 0.02);
}

:deep(.ant-collapse-header) {
  background: rgba(255, 255, 255, 0.04) !important;
  padding: 16px 20px !important;
  font-weight: 600;
  color: rgba(255, 255, 255, 0.8) !important;
}

:deep(.ant-collapse-expand-icon) {
  color: rgba(255, 255, 255, 0.4) !important;
}

:deep(.ant-collapse-content) {
  border-top: 1px solid rgba(255, 255, 255, 0.06) !important;
  background: transparent !important;
}

:deep(.ant-collapse-content-box) {
  padding: 20px;
  color: rgba(255, 255, 255, 0.7);
}

/* Descriptions 暗色 */
:deep(.ant-descriptions) {
  background: transparent;
}

:deep(.ant-descriptions-bordered .ant-descriptions-item-label) {
  background: rgba(255, 255, 255, 0.04) !important;
  color: rgba(255, 255, 255, 0.5) !important;
  border-color: rgba(255, 255, 255, 0.06) !important;
}

:deep(.ant-descriptions-bordered .ant-descriptions-item-content) {
  background: transparent !important;
  color: rgba(255, 255, 255, 0.8) !important;
  border-color: rgba(255, 255, 255, 0.06) !important;
}

:deep(.ant-descriptions-item-label) {
  color: rgba(255, 255, 255, 0.5) !important;
}

:deep(.ant-descriptions-item-content) {
  color: rgba(255, 255, 255, 0.8) !important;
}

/* Divider 暗色 */
:deep(.ant-divider) {
  border-color: rgba(255, 255, 255, 0.08) !important;
  color: rgba(255, 255, 255, 0.6) !important;
}

:deep(.ant-divider-inner-text) {
  color: rgba(255, 255, 255, 0.6) !important;
}

/* Empty 暗色 */
:deep(.ant-empty-description) {
  color: rgba(255, 255, 255, 0.4) !important;
}

/* 景点卡片样式 */
:deep(.ant-list-item) {
  transition: all 0.3s ease;
}

:deep(.ant-list-item:hover) {
  transform: scale(1.02);
}

/* 动画 */
@keyframes fadeInDown {
  from {
    opacity: 0;
    transform: translateY(-20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

@keyframes fadeInUp {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 响应式设计 */
@media (max-width: 768px) {
  .result-main {
    padding: 60px 10px 24px;
  }

  .content-wrapper {
    padding: 14px;
  }

  .top-switch-nav {
    gap: 8px;
  }

  .top-switch-menu-wrap {
    overflow-x: auto;
    overflow-y: hidden;
    -webkit-overflow-scrolling: touch;
    scrollbar-width: none;
    -ms-overflow-style: none;
  }

  .top-switch-menu {
    min-width: max-content;
  }

  .top-switch-menu-wrap::-webkit-scrollbar {
    width: 0;
    height: 0;
    display: none;
  }

  .top-switch-actions {
    max-width: 44%;
  }

  .top-switch-actions :deep(.ant-space) {
    column-gap: 6px !important;
    row-gap: 6px !important;
  }

  .top-switch-actions :deep(.ant-btn-default),
  .top-switch-actions :deep(.ant-btn-primary) {
    height: 32px !important;
    padding: 0 10px !important;
    font-size: 11px !important;
  }

  .top-info-section {
    flex-direction: column;
  }

  .left-info {
    flex: auto;
  }

  .weather-dashboard {
    flex-direction: column;
    min-height: auto;
    border-radius: 16px;
  }

  .weather-side {
    flex: 0 0 auto;
    width: 100%;
    min-height: 260px;
    border-radius: 16px 16px 0 0;
    transform: none !important;
  }

  .weather-info-side {
    padding: 12px;
  }

  .weather-temp {
    font-size: 46px;
  }

  .weather-desc {
    font-size: 18px;
  }

  .week-list {
    justify-content: space-between;
  }

  .week-list > li {
    width: calc(33.333% - 7px);
    min-width: 88px;
    padding: 8px 6px;
  }

  .right-budget-summary {
    flex: auto;
    width: 100%;
  }

  .budget-summary-panel {
    min-height: auto;
  }

  .budget-summary-title {
    font-size: 30px;
  }

  .budget-summary-total-value {
    font-size: 56px;
  }

  .budget-summary-sub-value {
    font-size: 24px;
  }

  .overview-meta {
    gap: 8px;
    margin-bottom: 14px;
  }

  .overview-meta-item {
    width: 100%;
    border-radius: 12px;
  }

  .overview-swiper .swiper-wrapper {
    gap: 1rem;
    min-height: 27rem;
  }

  .overview-swiper .swiper {
    padding: 2.4rem 0 0.6rem;
  }

  .budget-toolbar {
    gap: 8px;
  }

  .budget-detail-panel {
    min-height: auto;
    padding: 14px;
  }

  .budget-toolbar-item {
    width: 100%;
    justify-content: space-between;
  }

  .budget-select {
    width: 170px;
  }

  .budget-detail-list {
    overflow-x: auto;
  }

  .budget-detail-row {
    min-width: 520px;
  }

}

</style>

<style>
:root {
  --tripxu-map-accent: #d76e42;
  --tripxu-map-accent-strong: #a14625;
  --tripxu-map-surface: rgba(17, 29, 38, 0.96);
  --tripxu-map-border: rgba(215, 110, 66, 0.35);
  --tripxu-map-text-main: #f6fbff;
  --tripxu-map-text-sub: rgba(240, 246, 252, 0.72);
}

/* ===== 路书同款地图：三类点位标记 + 简洁信息窗 + 名称开关 ===== */
.tripxu-map-dot {
  width: 26px;
  height: 26px;
  border-radius: 50%;
  color: #fff;
  font-size: 10.5px;
  font-weight: 700;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2px solid #fff;
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.45);
  white-space: nowrap;
}

.tripxu-map-iw {
  background: rgba(10, 20, 28, 0.95);
  border: 1px solid rgba(215, 110, 66, 0.4);
  border-radius: 10px;
  padding: 10px 14px;
  min-width: 120px;
  text-align: center;
}

.tripxu-map-iw-title {
  color: #f6fbff;
  font-size: 14px;
  font-weight: 600;
  margin-bottom: 8px;
}

.tripxu-map-iw-nav {
  display: inline-block;
  background: #d76e42;
  color: #fff;
  font-size: 12.5px;
  font-weight: 600;
  padding: 5px 16px;
  border-radius: 7px;
  text-decoration: none;
}

.tripxu-map-iw-nav:active {
  opacity: 0.85;
}

.map-labels-toggle {
  position: absolute;
  top: 12px;
  right: 12px;
  z-index: 10;
  background: rgba(10, 20, 28, 0.85);
  border: 1px solid rgba(215, 110, 66, 0.45);
  border-radius: 8px;
  padding: 5px 12px;
  font-size: 12px;
  font-weight: 600;
  color: #f6fbff;
  cursor: pointer;
  backdrop-filter: blur(6px);
}

.map-labels-toggle.on {
  background: #d76e42;
  border-color: #d76e42;
}

.tripxu-map-marker {
  position: relative;
  width: 34px;
  height: 34px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
}

.tripxu-map-marker__core {
  position: relative;
  z-index: 1;
  width: 20px;
  height: 20px;
  /* border-radius: 50%; */
  display: inline-flex;
  align-items: center;
  justify-content: center;
  /* background: rgba(0, 0, 0, 0.86);
  border: 1.2px solid rgba(255, 255, 255, 0.82);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.45); */
}

.tripxu-map-marker__icon {
  width: 12px;
  height: 12px;
  stroke: #ffffff;
  stroke-width: 1.6;
  stroke-linecap: round;
  stroke-linejoin: round;
  fill: none;
}

.tripxu-map-marker__index {
  position: absolute;
  top: calc(100% + 1px);
  left: 50%;
  transform: translateX(-50%);
  font-size: 15px;
  font-weight: bold;
  line-height: 1;
  color: #ffffff;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.9);
  white-space: nowrap;
  pointer-events: none;
}

.tripxu-map-tooltip {
  max-width: min(320px, calc(100vw - 40px));
  background: transparent;
  border: none;
  box-shadow: none;
  padding: 0;
  color: var(--tripxu-map-text-main);
  pointer-events: none;
}

.tripxu-map-tooltip__line {
  margin: 0;
  font-size: 12px;
  line-height: 1.45;
  color: #ffd6c7 !important;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85);
  background-color: rgba(0, 0, 0, 0.05);
  white-space: nowrap;
}

.tripxu-map-tooltip__line + .tripxu-map-tooltip__line {
  margin-top: 2px;
}

.tripxu-map-tooltip__line--title {
  font-size: 15px;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.85);
  font-weight: 700;
  color: #ffffff !important;
}

#amap-container .amap-info-content {
  background: transparent !important;
  border: none !important;
  box-shadow: none !important;
  padding: 0 !important;
}

#amap-container .amap-info-sharp {
  display: none !important;
}

/* ===== 路书/编辑增强：新增景点弹窗与跨天移动弹窗（Modal 挂载在 body，需全局样式） ===== */
.add-attraction-btn {
  margin-bottom: 12px;
}

.poi-result-list {
  margin-top: 12px;
  max-height: 320px;
  overflow-y: auto;
}

.poi-result-item {
  padding: 10px 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 8px;
  margin-bottom: 8px;
  cursor: pointer;
  transition: border-color 0.2s, background 0.2s;
}

.poi-result-item:hover {
  border-color: var(--tripxu-map-accent, #d76e42);
  background: rgba(215, 110, 66, 0.08);
}

.poi-result-item .poi-name {
  font-weight: 600;
  font-size: 14px;
}

.poi-result-item .poi-sub {
  font-size: 12px;
  opacity: 0.65;
  margin-top: 2px;
}

.move-modal-hint {
  margin-bottom: 12px;
  opacity: 0.85;
}

/* 餐饮行内编辑（编辑模式） */
.meal-edit-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  margin-bottom: 12px;
}

.meal-edit-row {
  display: flex;
  gap: 6px;
  align-items: center;
  flex-wrap: wrap;
}

/* 计划名称（概览区标题） */
.plan-title-row {
  margin: 4px 0 10px;
}

.plan-title {
  margin: 0;
  font-size: 24px;
  font-weight: 700;
  color: #f6fbff;
  letter-spacing: 0.02em;
}

.plan-title-input {
  max-width: 480px;
}

/* 住宿行内编辑（编辑模式） */
.hotel-edit-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 8px;
}

/* 景点间交通段（查看模式） */
.transfer-leg-view {
  margin-top: 8px;
  padding: 6px 10px;
  border-left: 3px solid var(--tripxu-map-accent, #d76e42);
  background: rgba(215, 110, 66, 0.08);
  border-radius: 0 6px 6px 0;
  font-size: 12.5px;
  color: #e8b49a;
}
</style>
