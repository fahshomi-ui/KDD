import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bell, Check, Trash2, Package, BellRing } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger,
} from '@/components/ui/sheet';
import { useNotifications } from '@/hooks/useNotifications';
import { useLanguage } from '@/contexts/LanguageContext';

const NotificationsBell = () => {
  const { lang } = useLanguage();
  const { list, unreadCount, markAllRead, clearAll, requestPermission } = useNotifications();
  const [open, setOpen] = useState(false);

  const onOpenChange = async (v: boolean) => {
    setOpen(v);
    if (v) {
      await requestPermission();
      // small delay so the badge stays visible briefly
      setTimeout(() => markAllRead(), 400);
    }
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          aria-label={lang === 'ar' ? 'الإشعارات' : 'Notifications'}
          className="relative h-9 w-9 sm:h-10 sm:w-10 text-primary-foreground/70 hover:text-primary-foreground hover:bg-primary-foreground/10 rounded-xl transition-all duration-300"
        >
          {unreadCount > 0 ? (
            <BellRing className="w-5 h-5 animate-[wiggle_1s_ease-in-out_infinite]" />
          ) : (
            <Bell className="w-5 h-5" />
          )}
          {unreadCount > 0 && (
            <span className="absolute -top-1 -end-1 min-w-[20px] h-5 bg-amber-400 text-amber-950 text-[10px] rounded-full flex items-center justify-center font-bold px-1 shadow-lg">
              {unreadCount}
            </span>
          )}
        </Button>
      </SheetTrigger>

      <SheetContent side={lang === 'ar' ? 'left' : 'right'} className="w-full sm:max-w-md p-0 flex flex-col">
        <SheetHeader className="p-5 border-b border-border">
          <SheetTitle className="font-cairo flex items-center gap-2">
            <Bell className="w-5 h-5 text-primary" />
            {lang === 'ar' ? 'الإشعارات' : 'Notifications'}
            {list.length > 0 && (
              <span className="text-xs font-normal text-muted-foreground">({list.length})</span>
            )}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {list.length === 0 ? (
            <div className="p-10 text-center text-muted-foreground">
              <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-muted flex items-center justify-center">
                <Bell className="w-8 h-8 opacity-50" />
              </div>
              <p className="font-cairo font-bold text-foreground mb-1">
                {lang === 'ar' ? 'لا توجد إشعارات بعد' : 'No notifications yet'}
              </p>
              <p className="text-xs">
                {lang === 'ar'
                  ? 'ستظهر هنا تحديثات طلباتك مباشرة'
                  : 'Order updates will appear here in real time'}
              </p>
            </div>
          ) : (
            <ul className="divide-y divide-border">
              {list.map((n) => (
                <li key={n.id}>
                  <Link
                    to={`/track/${n.order_number}`}
                    onClick={() => setOpen(false)}
                    className="flex gap-3 p-4 hover:bg-muted/50 transition-colors"
                  >
                    <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center shrink-0">
                      <Package className="w-5 h-5" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="font-bold font-cairo text-sm">
                        {lang === 'ar' ? n.title_ar : n.title_en}
                      </div>
                      <div className="text-xs text-muted-foreground mt-0.5 line-clamp-2">
                        {lang === 'ar' ? n.body_ar : n.body_en}
                      </div>
                      <div className="text-[10px] text-muted-foreground/80 mt-1">
                        {new Date(n.created_at).toLocaleString(lang === 'ar' ? 'ar-KW' : 'en-US')}
                      </div>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {list.length > 0 && (
          <div className="p-3 border-t border-border flex gap-2">
            <Button variant="outline" size="sm" className="flex-1 gap-1.5" onClick={markAllRead}>
              <Check className="w-4 h-4" />
              {lang === 'ar' ? 'تعليم كمقروء' : 'Mark read'}
            </Button>
            <Button variant="outline" size="sm" className="flex-1 gap-1.5 text-destructive" onClick={clearAll}>
              <Trash2 className="w-4 h-4" />
              {lang === 'ar' ? 'مسح الكل' : 'Clear all'}
            </Button>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
};

export default NotificationsBell;