import { Component, OnInit } from '@angular/core';
import _ from 'lodash';
import { Router, NavigationEnd } from '@angular/router';
import { ItemService } from '../../services/sync/item.service';
import { Task } from '../../services/sync/types';
import { NetworkService } from '../../services/network.service';
import { VoyagerService } from '../../services/sync/voyager.service';
import { ToastController } from '@ionic/angular';
import { AuthService } from '../../services/auth.service';
import { OfflineToggleService } from '../../services/offlineSimulation.service';

@Component({
  selector: 'app-page-task',
  templateUrl: 'task.page.html',
  styleUrls: ['task.page.scss'],
})

export class TaskPage implements OnInit {

  items: Array<Task>;
  online: boolean;
  offlineToggle: boolean;
  queue: number;
  errors: any;

  constructor(
    private router: Router,
    public itemService: ItemService,
    public networkService: NetworkService,
    public offlineToggleService: OfflineToggleService,
    public aerogear: VoyagerService,
    public toastController: ToastController,
    public auth: AuthService
  ) {
    this.items = [];
  }

  async ngOnInit() {
    await this.auth.initialized;
    // Root element of the data app
    // When view is initialized:
    // We try to do network request first to get fresh data
    // Then we subscribe to any updates that happen in local cache
    // Local cache can be updated by mutations that happen on the app
    await this.loadData();
    await this.setupQueueStatusBar();
  }

  // Setup status bar that shows online status
  private offlineToggleEnabled() {
    console.log('it wotrked');
  }

  private async setupQueueStatusBar() {
    this.online = !await this.networkService.networkInterface.isOffline();
    this.offlineToggle = this.offlineToggleService.offlineToggle;
    console.log(this.offlineToggle);


    this.networkService.networkInterface.onStatusChangeListener({
      onStatusChange: (networkInfo) => {
        console.log(`Network state changed. Online: ${networkInfo.online}`);
        this.online = networkInfo.online;
      }
    });
    console.log(`Online: ${this.online}`);

    console.log(`NetworkStatus Provider: ${this.networkService.networkInterface.constructor.name}`);
    const self = this;
    this.aerogear.queueListener = {
      onOperationEnqueued() {
        self.queue = self.queue + 1;
      },
      queueCleared() {
        self.queue = 0;
      }
    };
    this.queue = 0;
  }

  private async loadData() {
    // Refresh cache first
    await this.itemService.refreshItems().catch(() => {
      this.presentToast('Cannot refresh items from server');
    });
    // Subscribe to local cache changes
    this.itemService.getItems().subscribe(result => {
      if (result && !result.errors) {
        console.log('Result from query', result);
        this.items = result.data && result.data.allTasks;
      } else {
        console.log('error from query', result);
        this.presentToast('Cannot load data from cache');
      }
    }, error => {
      console.log('error from query', error);
      this.presentToast('Problem with listening to cache changes.');
    });
  }

  openNewItemPage() {
    this.router.navigate(['/new-item']);
  }

  goToItem(item) {
    this.router.navigate(['/update-item', item]);
  }

  deleteItem(item) {
    this.itemService.deleteItem(item).then(result => {
      console.log('Result from delete mutation', result);
      this.presentToast('Item deleted');
    });
  }

  async presentToast(message) {
    const toast = await this.toastController.create({
      message: message,
      duration: 3000
    });
    toast.present();
  }

  restart() {
    this.itemService.voyagerService.toggleOnline();
    this.online = !this.online;
  }
}
