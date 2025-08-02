import { AccountInfo } from "@/components/profile/AccountInfo";
import MenuAppBar from "@/components/ui/appbar";
import { Separator } from "@/components/ui/separator";
import { checkIfUserCompleteOnboarding } from "@/lib/CheckCompOnb";

const Settings = async () => {
  const session = await checkIfUserCompleteOnboarding('/profile');

  return (
    <>
      <main>
        <div className="mb-7">
            
        <MenuAppBar/>
        </div>
        {/* <Heading /> */}
        <AccountInfo session={session} />
        <div className="p-4 sm:p-6">
          <Separator />
        </div>
        {/* <DeleteAccount userEmail={session.user.email!} /> */}
      </main>
    </>
  );
};

export default Settings;
